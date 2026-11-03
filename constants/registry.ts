import { Province } from '@/types/index';

// Zimbabwe Provinces and Districts
export const ZIMBABWE_PROVINCES: Province[] = [
  {
    id: 'harare',
    name: 'Harare',
    districts: ['Harare Central', 'Harare South', 'Harare North', 'Harare West', 'Harare East']
  },
  {
    id: 'bulawayo',
    name: 'Bulawayo',
    districts: ['Bulawayo Central', 'Bulawayo South', 'Bulawayo North', 'Bulawayo West', 'Bulawayo East']
  },
  {
    id: 'manicaland',
    name: 'Manicaland',
    districts: ['Mutare', 'Chipinge', 'Buhera', 'Makoni', 'Nyanga']
  },
  {
    id: 'masvingo',
    name: 'Masvingo',
    districts: ['Masvingo', 'Gutu', 'Chiredzi', 'Mwenezi', 'Zaka']
  },
  {
    id: 'midlands',
    name: 'Midlands',
    districts: ['Gweru', 'Kwekwe', 'Gokwe', 'Shurugwi', 'Zvishavane']
  },
  {
    id: 'matabeleland-north',
    name: 'Matabeleland North',
    districts: ['Bulawayo', 'Hwange', 'Lupane', 'Tsholotsho', 'Umguza']
  },
  {
    id: 'matabeleland-south',
    name: 'Matabeleland South',
    districts: ['Beitbridge', 'Gwanda', 'Insiza', 'Matobo', 'Umzingwane']
  },
  {
    id: 'mashonaland-west',
    name: 'Mashonaland West',
    districts: ['Chinhoyi', 'Karoi', 'Kadoma', 'Chegutu', 'Zvimba']
  },
  {
    id: 'mashonaland-central',
    name: 'Mashonaland Central',
    districts: ['Mount Darwin', 'Bindura', 'Guruve', 'Mazowe', 'Rushinga']
  },
  {
    id: 'mashonaland-east',
    name: 'Mashonaland East',
    districts: ['Marondera', 'Murehwa', 'Uzumba-Maramba-Pfungwe', 'Goromonzi', 'Chikomba']
  }
];

// Technician Specializations - Refrigeration & Air Conditioning only
export const TECHNICIAN_SPECIALIZATIONS = [
  'Refrigeration & Air Conditioning',
  'HVAC',
  'Cold Room Installation',
  'Commercial Refrigeration',
  'Domestic Refrigeration',
  'Air Conditioning',
  'Split System Installation',
  'Central Air Conditioning',
  'Refrigerant Handling',
  'Heat Pump Systems',
  'Chiller Systems',
  'Industrial Commercial Refrigeration'
];

// Issuing Bodies for Certifications
export const CERTIFICATION_ISSUING_BODIES = [
  'Zimbabwe National Council for Higher Education (ZIMCHE)',
  'National Employment Councils (NECs)',
  'Vocational Training Centres (VTCs)',
  'Polytechnics',
  'Technical Colleges',
  'Industry Associations',
  'International Certifying Bodies'
];
