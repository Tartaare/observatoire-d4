// Adapté du registre shadcn/ui New York, licence MIT (voir docs/ui-components.md).
import * as React from 'react';
import * as Primitive from '@radix-ui/react-accordion';
import {ChevronDown} from 'lucide-react';
import {cn} from '../utils';

export const Accordion = Primitive.Root;
export const AccordionItem = React.forwardRef<React.ElementRef<typeof Primitive.Item>, React.ComponentPropsWithoutRef<typeof Primitive.Item>>(
  ({className, ...props}, ref) => <Primitive.Item ref={ref} className={cn('od-accordion-item', className)} {...props} />);
AccordionItem.displayName = 'AccordionItem';
export const AccordionTrigger = React.forwardRef<React.ElementRef<typeof Primitive.Trigger>, React.ComponentPropsWithoutRef<typeof Primitive.Trigger>>(
  ({className, children, ...props}, ref) => <Primitive.Header className="od-accordion-heading"><Primitive.Trigger ref={ref}
    className={cn('od-accordion-trigger', className)} {...props}>{children}<ChevronDown aria-hidden="true" className="od-chevron" /></Primitive.Trigger></Primitive.Header>);
AccordionTrigger.displayName = 'AccordionTrigger';
export const AccordionContent = React.forwardRef<React.ElementRef<typeof Primitive.Content>, React.ComponentPropsWithoutRef<typeof Primitive.Content>>(
  ({className, children, ...props}, ref) => <Primitive.Content ref={ref} className={cn('od-accordion-content', className)} {...props}>{children}</Primitive.Content>);
AccordionContent.displayName = 'AccordionContent';
