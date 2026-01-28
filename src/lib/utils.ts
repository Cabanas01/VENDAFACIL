import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isValidCnpj(cnpj: string): boolean {
  if (!cnpj) return false;

  const justNumbers = cnpj.replace(/[^\d]/g, '');

  if (justNumbers.length !== 14) return false;
  if (/^(\d)\1+$/.test(justNumbers)) return false; // Check for all same digits

  let size = justNumbers.length - 2;
  let numbers = justNumbers.substring(0, size);
  const digits = justNumbers.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0), 10)) return false;

  size = size + 1;
  numbers = justNumbers.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1), 10)) return false;

  return true;
}

export function isValidCpf(cpf: string): boolean {
    if (typeof cpf !== 'string') return false;
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
    const cpfDigits = cpf.split('').map(el => +el);
    const rest = (count: number): number => {
        return (cpfDigits.slice(0, count-12).reduce((soma, el, index) => {
            return soma + el * (count - index);
        }, 0) * 10) % 11 % 10;
    };
    return rest(10) === cpfDigits[9] && rest(11) === cpfDigits[10];
}
