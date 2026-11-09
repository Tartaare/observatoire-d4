#!/usr/bin/env python3
"""Prototype en lecture seule. Installation : py -m pip install lxml."""
import argparse
from datetime import datetime, timezone
import json
import re
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qsl, urlencode, urljoin, urlsplit
from urllib.request import Request, urlopen

from lxml import html


ORIGIN = "https://leonzelotois.fr"
SOURCE = "le_onze_lotois"
MAX_BYTES = 3_000_000
SENIOR_DIVISIONS = {"L1", "L2", "N1", "N2", "N3", "R1", "R2", "R3", "D1", "D2", "D3", "D4"}


def class_xpath(tag, name):
    return f'{tag}[contains(concat(" ", normalize-space(@class), " "), " {name} ")]'


def elements(node, name, tag="*"):
    return node.xpath(".//" + class_xpath(tag, name))


def text(node):
    return " ".join(node.text_content().split())


def field(node, name):
    matches = elements(node, name)
    return text(matches[0]) if matches else None


def checked_url(value, kind=None):
    parts = urlsplit(value)
    if parts.scheme != "https" or parts.netloc != "leonzelotois.fr":
        raise ValueError("Seules les URL HTTPS de leonzelotois.fr sont acceptées")
    if kind is None and parts.path.rstrip("/") == "/division/d4":
        query = parse_qsl(parts.query, keep_blank_values=True)
        if len({key for key, _ in query}) != len(query) or any(
            key not in {"journee", "avenir"} or not re.fullmatch(r"[1-9][0-9]?", val)
            for key, val in query
        ):
            raise ValueError("Paramètres acceptés sur /division/d4/ : journee et avenir")
        return ORIGIN + "/division/d4/" + ("?" + urlencode(query) if query else "")
    match = re.fullmatch(r"/(club|matchs)/[a-z0-9-]+/?", parts.path)
    if not match or (kind and match.group(1) != kind) or parts.query or parts.fragment:
        raise ValueError("Chemin attendu : /club/.../, /matchs/.../ ou /division/d4/")
    return ORIGIN + parts.path.rstrip("/") + "/"


class Reader:
    def __init__(self):
        self.last_request = 0.0

    def get(self, url):
        delay = 1.0 - (time.monotonic() - self.last_request)
        if delay > 0:
            time.sleep(delay)
        self.last_request = time.monotonic()
        request = Request(url, headers={
            "User-Agent": "Observatoire-D4/0.1 (personal match-sheet reader)",
            "Accept": "text/html",
        })
        with urlopen(request, timeout=12) as response:
            checked_url(response.geturl())
            if response.headers.get_content_type() != "text/html":
                raise ValueError("Réponse non HTML")
            data = response.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            raise ValueError("Page trop volumineuse")
        return html.fromstring(data)


def match_cards(doc):
    rows = {}
    for card in elements(doc, "mc", "a"):
        badges = elements(card, "div")
        if not badges:
            continue
        level = " ".join(" ".join(badges[0].xpath("./text()")).split())
        status = field(card, "ft")
        if not status or level not in SENIOR_DIVISIONS:
            continue
        try:
            url = checked_url(urljoin(ORIGIN, card.get("href") or ""), "matchs")
        except ValueError:
            continue
        round_text = field(card, "div-round") or ""
        round_no = re.search(r"\d+", round_text)
        item = {"source_url": url, "division": level, "status_label": status,
                "round": int(round_no.group()) if round_no else None,
                "teams": [text(team) for team in elements(card, "team-name")]}
        if url not in rows or status == "Terminé":
            rows[url] = item
    return list(rows.values())


def parse_division(doc, url):
    fixtures = []
    navigation = set()
    for section_id in ("resultats", "avenir"):
        sections = doc.xpath(f'//*[@id="{section_id}"]')
        if not sections:
            raise ValueError(f"Section {section_id} introuvable")
        section = sections[0]
        for heading in section.xpath("./h3"):
            group = text(heading)
            grid = heading.getnext()
            if grid is not None and group.startswith("POULE "):
                fixtures.extend({**match, "group": group} for match in match_cards(grid))
        for link in elements(section, "journee-puce", "a"):
            navigation.add(checked_url(urljoin(ORIGIN, link.get("href") or "")))
    standings = []
    for group in doc.xpath('//*[@id="classement"]/*[h2 and table]'):
        label = text(group.xpath("./h2")[0]).split("·")[-1].strip()
        for row in group.xpath("./table/tbody/tr"):
            team = field(row, "team-name")
            rank, points = field(row, "rk"), field(row, "p")
            links = elements(row, "crest-lien", "a")
            if team and rank and rank.isdecimal():
                standings.append({"group": label, "team": team, "rank": int(rank),
                                  "points_label": points,
                                  "club_source_url": links[0].get("href") if links else None})
    if not fixtures or not standings:
        raise ValueError("Calendrier ou classement D4 non reconnu")
    return {"source": SOURCE, "source_url": url,
            "collected_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "calendar_index": fixtures, "standings": standings,
            "round_page_urls": sorted(navigation), "errors": []}


def parse_lineup(doc, team_names):
    sheets = {}
    for column in elements(doc, "compo-col"):
        name = field(column, "compo-team")
        if name not in team_names:
            continue
        starters = []
        reserves = []
        incomplete = False
        for group in elements(column, "compo-list", "ol"):
            substitute = "compo-list--subs" in group.get("class", "").split()
            for row in group.xpath("./li"):
                player = field(row, "compo-nom")
                if not player:
                    incomplete = True
                    continue
                shirt = field(row, "num")
                entry = field(row, "compo-mvt--in")
                exit_ = field(row, "compo-mvt--out")
                entry_minute = re.search(r"\d+(?:\s*\+\s*\d+)?", entry or "")
                exit_minute = re.search(r"\d+(?:\s*\+\s*\d+)?", exit_ or "")
                status = "starter" if not substitute else "entered" if entry else "substitute_unknown"
                record = {
                    "display_name": player,
                    "shirt_number": int(shirt) if shirt and shirt.isdecimal() else None,
                    "status": status,
                    "entry_minute": entry_minute.group().replace(" ", "") if entry_minute else None,
                    "exit_minute": exit_minute.group().replace(" ", "") if exit_minute else None,
                }
                (reserves if substitute else starters).append(record)
        if starters or reserves:
            sheets[name] = {
                "state": "partial" if incomplete or len(starters) != 11 else "published",
                "players": starters + [player for player in reserves if player["status"] == "entered"],
                "unverified_substitutes": sum(player["status"] != "entered" for player in reserves),
            }
    return sheets


def parse_match(doc, url, club_url=None, before=None):
    heads = elements(doc, "match-head", "header")
    if not heads:
        raise ValueError("En-tête de match introuvable")
    head = heads[0]
    meta = field(head, "single-meta")
    teams = elements(head, "mt-team")
    if not meta or len(teams) != 2:
        raise ValueError("Métadonnées de match incomplètes")
    date = re.search(r"\b\d{2}/\d{2}/\d{4}\b", meta)
    kickoff = re.search(r"\b(\d{1,2})h(\d{2})\b", meta)
    round_no = re.search(r"\b(\d+)(?:re|e|ème)\s+journée\b", meta, re.IGNORECASE)
    score = re.fullmatch(r"(\d+)\s*[–—-]\s*(\d+)", field(head, "mt-score") or "")
    division = field(head, "htag")
    if division not in SENIOR_DIVISIONS or not round_no:
        raise ValueError("Division de championnat hors périmètre ou non reconnue")
    result = {
        "source": SOURCE, "source_url": url,
        "collected_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "division": division,
        "round": int(round_no[1]) if round_no else None,
        "match_date": datetime.strptime(date[0], "%d/%m/%Y").date().isoformat() if date else None,
        "published_kickoff_local": f"{int(kickoff[1]):02d}:{kickoff[2]}" if kickoff else None,
        "timezone": "Europe/Paris",
        "status_label": meta.split("·", 1)[0].strip(),
        "score": [int(score[1]), int(score[2])] if score else None,
        "teams": [],
    }
    if result["status_label"] != "Terminé":
        raise ValueError("Aucune participation retenue avant la fin du match")
    if before:
        if not result["match_date"]:
            raise ValueError("Date inconnue : antériorité non vérifiable")
        if result["match_date"] >= before:
            return None
    selected_names = set()
    for side, team in zip(("home", "away"), teams):
        name = field(team, "mt-name")
        if not name:
            raise ValueError("Nom d’équipe manquant")
        links = elements(team, "crest-lien", "a")
        team_club_url = links[0].get("href") if links else None
        if club_url is None or (team_club_url and team_club_url.rstrip("/") == club_url.rstrip("/")):
            selected_names.add(name)
        result["teams"].append({"side": side, "name": name,
                                "club_source_url": team_club_url})
    if not selected_names:
        raise ValueError("Aucune équipe du club recherché sur la fiche de match")
    sheets = parse_lineup(doc, selected_names)
    for team in result["teams"]:
        name = team["name"]
        state = "missing" if name in selected_names else "out_of_scope"
        team["sheet"] = sheets.get(name, {"state": state, "players": []})
    return result


def run(url, reader, upper_only=False, before=None):
    path = urlsplit(url).path
    if path.startswith("/matchs/"):
        return {"matches": [parse_match(reader.get(url), url)], "errors": []}
    if path == "/division/d4/":
        return parse_division(reader.get(url), url)
    index = match_cards(reader.get(url))
    if not index:
        raise ValueError("Aucune carte de championnat senior reconnue sur la page club")
    if upper_only:
        index = [fixture for fixture in index if fixture["division"] != "D4"]
    results = {"club_source_url": url, "calendar_index": index, "matches": [], "errors": []}
    for fixture in index:
        if fixture["status_label"] != "Terminé":
            continue
        match_url = fixture["source_url"]
        try:
            match = parse_match(reader.get(match_url), match_url, club_url=url, before=before)
            if match is None:
                continue
            if match["division"] != fixture["division"]:
                raise ValueError("Division différente entre l’index et la fiche")
            results["matches"].append(match)
        except (ValueError, URLError, TimeoutError) as error:
            results["errors"].append({"source_url": match_url, "error": str(error)})
            if isinstance(error, HTTPError) and error.code in (403, 429):
                results["stopped_early"] = True
                break
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url", help="URL publique Le Onze Lotois d’un match, d’un club ou de la D4")
    parser.add_argument("-o", "--output", help="fichier JSON de destination, encodé en UTF-8")
    parser.add_argument("--upper-only", action="store_true",
                        help="mode club : ne lire que les divisions supérieures à la D4")
    parser.add_argument("--before", metavar="AAAA-MM-JJ",
                        help="mode club : ne retenir que les matchs strictement antérieurs à cette date")
    args = parser.parse_args()
    try:
        url = checked_url(args.url)
        if (args.upper_only or args.before) and not urlsplit(url).path.startswith("/club/"):
            parser.error("--upper-only et --before nécessitent une URL de club")
        before = datetime.strptime(args.before, "%Y-%m-%d").date().isoformat() if args.before else None
        result = run(url, Reader(), upper_only=args.upper_only, before=before)
    except (ValueError, URLError, TimeoutError) as error:
        print(f"Collecte impossible : {error}", file=sys.stderr)
        return 1
    data = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        with open(args.output, "w", encoding="utf-8") as file:
            file.write(data)
    else:
        sys.stdout.buffer.write(data.encode("utf-8"))
    return 2 if result["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
