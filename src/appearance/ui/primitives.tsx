import type {ComponentProps, ReactElement, ReactNode} from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import {ChevronDown, LoaderCircle} from 'lucide-react';
import {cn} from '../utils';

// Primitives de présentation shadcn adaptées aux tokens locaux ; aucune dépendance headless nécessaire.
export function Badge({className, ...props}: ComponentProps<'span'>) {
  return <span className={cn('od-badge', className)} {...props} />;
}
export function NativeSelect({className, children, ...props}: ComponentProps<'select'>) {
  return <span className="od-native-select"><select className={cn('od-input', className)} {...props}>{children}</select><ChevronDown aria-hidden="true" /></span>;
}
export function Alert({children, className, ...props}: ComponentProps<'div'>) {
  return <div className={cn('od-alert', className)} {...props}>{children}</div>;
}
export function Skeleton({className, ...props}: ComponentProps<'div'>) {
  return <div className={cn('od-skeleton', className)} aria-hidden="true" {...props} />;
}
export function Spinner() { return <LoaderCircle className="od-spinner" aria-hidden="true" />; }
export function Hint({label, disabled, children}: {label: string; disabled?: boolean; children: ReactElement}) {
  if (disabled) return children;
  return <Tooltip.Root><Tooltip.Trigger asChild>{children}</Tooltip.Trigger><Tooltip.Portal><Tooltip.Content className="od-tooltip" sideOffset={6}>{label}</Tooltip.Content></Tooltip.Portal></Tooltip.Root>;
}
export function Empty({icon, title, children}: {icon: ReactNode; title: string; children?: ReactNode}) {
  return <div className="od-empty-state"><span className="od-empty-icon">{icon}</span><h2>{title}</h2>{children}</div>;
}
