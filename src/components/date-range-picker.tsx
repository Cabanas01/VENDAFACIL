'use client';

import * as React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { addDays, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type DateRangePickerProps = React.HTMLAttributes<HTMLDivElement> & {
  date?: DateRange;
  onDateChange: (date: DateRange | undefined) => void;
};

export function DateRangePicker({ className, date, onDateChange }: DateRangePickerProps) {
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  const handlePresetChange = (value: string) => {
    const now = new Date();
    switch (value) {
      case 'today':
        onDateChange({ from: now, to: now });
        break;
      case 'last7':
        onDateChange({ from: addDays(now, -6), to: now });
        break;
      case 'last30':
        onDateChange({ from: addDays(now, -29), to: now });
        break;
      case 'this_week':
        onDateChange({ from: startOfWeek(now, { locale: ptBR }), to: endOfWeek(now, { locale: ptBR }) });
        break;
      case 'this_month':
        onDateChange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      default:
        onDateChange(undefined);
    }
    setIsPopoverOpen(false);
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-[300px] justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'LLL dd, y', { locale: ptBR })} -{' '}
                  {format(date.to, 'LLL dd, y', { locale: ptBR })}
                </>
              ) : (
                format(date.from, 'LLL dd, y', { locale: ptBR })
              )
            ) : (
              <span>Selecione um período</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-2">
            <Select onValueChange={handlePresetChange}>
              <SelectTrigger>
                <SelectValue placeholder="Períodos rápidos" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="last7">Últimos 7 dias</SelectItem>
                <SelectItem value="last30">Últimos 30 dias</SelectItem>
                <SelectItem value="this_week">Esta semana</SelectItem>
                <SelectItem value="this_month">Este mês</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={2}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
