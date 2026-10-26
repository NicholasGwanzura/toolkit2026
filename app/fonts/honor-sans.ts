import localFont from 'next/font/local';

// HONOR Sans is used under the HONOR Sans Copyright License Agreement (see ./honor-sans/LICENSE.txt).
export const honorSans = localFont({
  src: [
    { path: './honor-sans/HONORSans-Regular.ttf', weight: '400', style: 'normal' },
    { path: './honor-sans/HONORSans-Medium.ttf', weight: '500', style: 'normal' },
    { path: './honor-sans/HONORSans-Bold.ttf', weight: '700', style: 'normal' },
  ],
  variable: '--font-honor-sans',
  display: 'swap',
});
