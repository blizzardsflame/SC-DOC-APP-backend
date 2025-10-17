import { LibGenLink } from '../models/LibGenLink.js';

const libgenLinksData = [
  // Search mirrors
  {
    name: 'LibGen.is',
    url: 'https://libgen.is',
    type: 'search' as const,
    isActive: true,
    priority: 1
  },
  {
    name: 'LibGen.st',
    url: 'https://libgen.st',
    type: 'search' as const,
    isActive: true,
    priority: 2
  },
  {
    name: 'LibGen.li',
    url: 'https://libgen.li',
    type: 'search' as const,
    isActive: true,
    priority: 3
  },
  {
    name: 'Gen.lib.rus.ec',
    url: 'http://gen.lib.rus.ec',
    type: 'search' as const,
    isActive: true,
    priority: 4
  },
  {
    name: 'LibGen.rs',
    url: 'http://libgen.rs',
    type: 'search' as const,
    isActive: true,
    priority: 5
  },
  
  // Download mirrors
  {
    name: 'LibGen.li Download',
    url: 'https://libgen.li',
    type: 'download' as const,
    isActive: true,
    priority: 1
  },
  {
    name: 'Library.lol',
    url: 'https://library.lol',
    type: 'download' as const,
    isActive: true,
    priority: 2
  },
  {
    name: '3lib.net',
    url: 'https://3lib.net',
    type: 'download' as const,
    isActive: true,
    priority: 3
  },
  {
    name: 'LibGen.st Download',
    url: 'https://libgen.st',
    type: 'download' as const,
    isActive: true,
    priority: 4
  }
];

export const seedLibGenLinks = async () => {
  try {
    console.log('🌱 Seeding LibGen links...');
    
    // Clear existing links
    await LibGenLink.deleteMany({});
    
    // Insert new links
    const links = await LibGenLink.insertMany(libgenLinksData);
    
    console.log(`✅ Successfully seeded ${links.length} LibGen links`);
    console.log('   - Search mirrors:', links.filter(l => l.type === 'search').length);
    console.log('   - Download mirrors:', links.filter(l => l.type === 'download').length);
    
    return links;
  } catch (error) {
    console.error('❌ Error seeding LibGen links:', error);
    throw error;
  }
};
