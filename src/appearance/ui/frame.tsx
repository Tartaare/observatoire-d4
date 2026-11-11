// coss ui Frame (MIT), adapté aux tokens et à Tailwind 3 ; aucun moteur Base UI requis.
import type {ComponentProps} from 'react';
import {cn} from '../utils';

export function Frame({className, ...props}: ComponentProps<'div'>) {
  return <div className={cn('od-frame', className)} data-slot="frame" {...props} />;
}
export function FrameHeader({className, ...props}: ComponentProps<'header'>) {
  return <header className={cn('od-frame-header', className)} data-slot="frame-panel-header" {...props} />;
}
export function FramePanel({className, ...props}: ComponentProps<'div'>) {
  return <div className={cn('od-frame-panel', className)} data-slot="frame-panel" {...props} />;
}
export function FrameFooter({className, ...props}: ComponentProps<'footer'>) {
  return <footer className={cn('od-frame-footer', className)} data-slot="frame-panel-footer" {...props} />;
}
