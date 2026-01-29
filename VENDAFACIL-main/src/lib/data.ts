import type { Product, Sale, CashRegister } from '@/lib/types';
import { subDays, subHours } from 'date-fns';

const now = new Date();

export const mockProducts: Product[] = [];

export const mockSales: Sale[] = [];

export const mockCashRegisters: CashRegister[] = [];
