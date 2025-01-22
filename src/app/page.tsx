import { Analytics } from '@vercel/analytics/react';
import { parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { TimeDisplay } from '@/components/TimeDisplay';

function getAvailabilityColorClass(available: number, total: number): string {
  if (available === 0) {
    return 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-200';
  }

  const percentage = (available / total) * 100;

  if (percentage <= 25) {
    return 'bg-orange-100 dark:bg-orange-900/30 text-orange-900 dark:text-orange-200';
  } else if (percentage <= 75) {
    return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-200';
  } else {
    return 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-200';
  }
}

interface Slot {
  date: string;
  numSpots: number;
  numAvailableSpots: number;
}

interface Availability {
  date: string;
  times: { text: string; colorClass: string; utcTime: string }[];
  totalSpots: number;
}

async function getAvailabilities(): Promise<Availability[]> {
  const dates = ['2025-02-20', '2025-02-21', '2025-02-22', '2025-02-23'];

  const promises = dates.map(async date => {
    try {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDate = nextDay.toISOString().split('T')[0];

      const response = await fetch(
        `https://api.waitwhile.com/v2/public/visits/pokemoncenteratexcel/availability?fromDate=${date}T00%3A00&toDate=${nextDate}T00%3A00`,
        { next: { revalidate: 300 } }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch data for ${date}`);
      }

      const data = await response.json();
      const slots: Slot[] = data || [];

      return {
        date,
        totalSpots: slots[0]?.numSpots || 0,
        times: slots
          .map(slot => {
            const date = parseISO(slot.date);
            const londonTime = formatInTimeZone(
              date,
              'Europe/London',
              'h:mm aa'
            );
            const utcTime = formatInTimeZone(date, 'UTC', 'HH:mm');

            return {
              londonTime: londonTime.toLowerCase(),
              utcTime,
              availableSpots: slot.numAvailableSpots,
              totalSpots: slot.numSpots,
              colorClass: getAvailabilityColorClass(
                slot.numAvailableSpots,
                slot.numSpots
              ),
            };
          })
          .map(
            ({
              londonTime,
              utcTime,
              availableSpots,
              totalSpots,
              colorClass,
            }) => ({
              text:
                availableSpots === 0
                  ? `${londonTime} (No spots available)`
                  : `${londonTime} (${availableSpots}/${totalSpots} spots available)`,
              utcTime,
              colorClass,
            })
          ),
      };
    } catch (error) {
      console.error(`Error fetching data for ${date}:`, error);
      return { date, times: [], totalSpots: 0 };
    }
  });

  return Promise.all(promises);
}

export default async function Home() {
  const availabilities = await getAvailabilities();

  return (
    <div className='min-h-screen p-8'>
      <Analytics />
      <div className='max-w-3xl mx-auto mb-12 text-center'>
        <h1 className='text-3xl font-bold mb-4'>Pokemon Center Availability</h1>
        <p className='text-gray-600 dark:text-gray-400 mb-2'>
          Check available appointment times for the Pokemon Center at Excel
          London from February 20-23, 2025.
        </p>
        <p className='text-sm text-gray-500 dark:text-gray-500'>
          Times are shown in local London time. Appointments are released daily.
        </p>
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
        {availabilities.map(availability => (
          <div
            key={availability.date}
            className='border rounded-lg p-4 shadow-sm'
          >
            <h2 className='text-xl font-semibold mb-3'>
              {formatInTimeZone(
                parseISO(availability.date),
                'Europe/London',
                'EEEE, MMMM d'
              )}
            </h2>
            {availability.times.length === 0 ? (
              <p className='text-red-500'>No available times</p>
            ) : (
              <ul className='space-y-2'>
                {availability.times.map((time, index) => (
                  <li key={index} className={`p-2 rounded ${time.colorClass}`}>
                    <TimeDisplay
                      utcTime={time.utcTime}
                      date={availability.date}
                    >
                      {time.text}
                    </TimeDisplay>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
