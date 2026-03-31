export const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const todayDateInput = () => formatDateInput(new Date());

export const parseDateInput = (value: string) => {
  if (!value) {
    return new Date(Number.NaN);
  }

  const [year, month, day] = value.split('-').map(Number);

  return new Date(year, month - 1, day);
};

export const isValidDate = (date: Date) => !Number.isNaN(date.getTime());

export const shiftDateInput = (value: string, days: number) => {
  const date = parseDateInput(value);
  date.setDate(date.getDate() + days);

  return formatDateInput(date);
};

export const startOfLocalDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());
