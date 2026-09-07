import { AspectRatio } from './types';

// FIX: Removed unsupported aspect ratios ("2:3", "21:9").
export const ASPECT_RATIOS: { label: string; value: AspectRatio }[] = [
  { label: 'Dọc (9:16)', value: '9:16' },
  { label: 'Vuông (1:1)', value: '1:1' },
  { label: 'Ngang (16:9)', value: '16:9' },
  { label: 'Chuẩn (4:3)', value: '4:3' },
  { label: 'Cao (3:4)', value: '3:4' },
];

export const ARTISTIC_ANGLES: string[] = [
  'Không có',
  'Góc máy ngang tầm mắt',
  'Góc máy thấp',
  'Góc máy cao',
  'Góc máy nghiêng',
  'Góc nhìn từ trên cao (mắt chim)',
  'Góc nhìn từ dưới lên (con sâu)',
  'Cận cảnh',
  'Trung cảnh',
  'Toàn cảnh',
  'Ánh sáng điện ảnh',
  'Giờ vàng',
];
