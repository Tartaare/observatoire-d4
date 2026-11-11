// Adaptation statique de ReUI Timeline (MIT) : sémantique liste/date, sans moteur d'étapes interactives.
import type {ComponentProps} from 'react';
import {cn} from '../utils';

export function Timeline({className, ...props}: ComponentProps<'ol'>) {
  return <ol data-slot="timeline" data-orientation="vertical" className={cn('od-history', className)} {...props} />;
}
export function TimelineItem(props: ComponentProps<'li'>) { return <li data-slot="timeline-item" {...props} />; }
export function TimelineDate({className, ...props}: ComponentProps<'time'>) {
  return <time data-slot="timeline-date" className={cn('od-history-date', className)} {...props} />;
}
export function TimelineContent({className, ...props}: ComponentProps<'div'>) {
  return <div data-slot="timeline-content" className={cn('od-history-body', className)} {...props} />;
}
