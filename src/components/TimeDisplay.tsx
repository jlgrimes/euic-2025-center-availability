'use client';

import { format, parseISO } from 'date-fns';

interface TimeDisplayProps {
  utcTime: string;
  date: string;
  children: React.ReactNode;
}

export function TimeDisplay({ utcTime, date, children }: TimeDisplayProps) {
  // Combine the date and UTC time
  const fullDateTime = `${date}T${utcTime}Z`;
  const localTime = format(parseISO(fullDateTime), 'h:mm aa').toLowerCase();

  // Replace the London time with local time in the text
  const text = children?.toString() || '';
  const localText = text.replace(/\d{1,2}:\d{2} [ap]m/, localTime);

  return <>{localText}</>;
}
