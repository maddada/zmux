import type { ComponentProps } from 'react';
import { PopoverContent } from './popover';
import { cn } from '../utils';
import './searchable-dropdown.css';

export function SearchableDropdownContent({
  positionerClassName,
  className,
  ...props
}: ComponentProps<typeof PopoverContent>) {
  return (
    <PopoverContent
      data-searchable-dropdown=''
      popupLayer={1302}
      className={cn('searchable-dropdown', className)}
      positionerClassName={positionerClassName}
      {...props}
    />
  );
}
