import axios from 'axios';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import https from 'https';
import * as cheerio from 'cheerio';

interface LibGenBook {
  id: string;
  libgen_id:string;
  title: string;
  author: string;
  publisher?: string;
  year?: string;
  pages?: string;
  language?: string;
  filesize?: string;
  extension?: string;
  md5?: string;
  isbn?: string;
  downloadUrl?: string;
  coverUrl?: string;
}

interface LibGenSearchResult {
  books: LibGenBook[];
  total: number;
  page: number;
  limit: number;
  mirrorStatus?: string[];
}

interface SearchOptions {
  onStatusUpdate?: (status: string) => void;
}

class LibGenService {
  private readonly baseUrls = [
    'https://libgen.li',
    'https://libgen.is',
    'https://libgen.st', 
    'http://gen.lib.rus.ec',
    'http://libgen.rs'
  ];

  private readonly downloadMirrors = [
    'https://libgen.li',
    'https://library.lol',
    'https://3lib.net',
    'https://libgen.st'
  ];

  /**
   * Search for books in LibGen
   */
  async searchBooks(query: string, page: number = 1, limit: number = 25, options: SearchOptions = {}, format?: string): Promise<LibGenSearchResult> {
    try {
      // First try real LibGen mirrors
      for (const baseUrl of this.baseUrls) {
        try {
          options.onStatusUpdate?.(`Searching on ${baseUrl}...`);
          
          let searchUrl: string;
          let params: any;
          
          // Different mirrors have different search endpoints
          if (baseUrl.includes('libgen.is') || baseUrl.includes('libgen.st')) {
            searchUrl = `${baseUrl}/search.php`;
            params = {
              req: query,
              lg_topic: 'libgen',  // Main library topic
              open: '0',
              view: 'simple',
              res: limit.toString(),
              sort: 'def',
              sortmode: 'ASC',
              page: page.toString(),
              // Restrict search to main fields only (books)
              column: 'def',  // Default search (title, author, etc.)
              // Exclude other topics by focusing on main library
              topic: 'l'  // 'l' typically represents the main library (books)
            };
          } else if (baseUrl.includes('libgen.li')) {
            // libgen.li uses a different URL structure
            searchUrl = `${baseUrl}/index.php`;
            params = {
              req: query,
              lg_topic: 'libgen',  // Main library only
              open: '0',
              view: 'simple',
              res: limit.toString(),
              sort: 'def',
              sortmode: 'ASC',
              page: page.toString(),
              // Focus on books only, exclude comics/magazines/etc
              column: 'def',
              topic: 'l'  // Library books only
            };
          } else if (baseUrl.includes('gen.lib.rus.ec')) {
            // gen.lib.rus.ec uses search.php
            searchUrl = `${baseUrl}/search.php`;
            params = {
              req: query,
              lg_topic: 'libgen',  // Main library only
              open: '0',
              view: 'simple',
              res: limit.toString(),
              sort: 'def',
              sortmode: 'ASC',
              page: page.toString(),
              // Focus on main library books only
              column: 'def',
              topic: 'l'  // Library books, not comics/magazines
            };
          } else {
            // For libgen.rs and others
            searchUrl = `${baseUrl}/search.php`;
            params = {
              req: query,
              lg_topic: 'libgen',  // Main library only
              open: '0',
              view: 'simple',
              res: limit.toString(),
              sort: 'def',
              sortmode: 'ASC',
              page: page.toString(),
              // Focus on main library books only
              column: 'def',
              topic: 'l'  // Library books, exclude comics/magazines/etc
            };
          }

          console.log(`Search URL: ${searchUrl}`);
          console.log(`Search params:`, params);
          
          const response = await axios.get(searchUrl, { 
            params,
            timeout: 5000, // Increased timeout to 15 seconds
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1'
            },
            httpsAgent: new https.Agent({
              rejectUnauthorized: false,
              keepAlive: true
            }),
            maxRedirects: 5
          });

          // Debug: Log the HTML response size and first 500 characters
          console.log(`HTML response size: ${response.data.length} characters`);
          console.log(`HTML preview: ${response.data.substring(0, 500)}...`);
          
          const books = this.parseSearchResults(response.data, baseUrl, format);
          
          if (books.length > 0) {
            options.onStatusUpdate?.(`Found ${books.length} books on ${baseUrl}`);
            return {
              books,
              total: books.length,
              page,
              limit,
              mirrorStatus: [`Successfully searched ${baseUrl}`]
            };
          } else {
            options.onStatusUpdate?.(`No results found on ${baseUrl}, trying next mirror...`);
          }
        } catch (error: any) {
          const errorMsg = error.code === 'ECONNREFUSED' ? 'Connection refused' : 
                          error.code === 'ETIMEDOUT' ? 'Connection timeout' :
                          error.response?.status ? `HTTP ${error.response.status}` :
                          error.message;
          options.onStatusUpdate?.(`Failed to search on ${baseUrl}: ${errorMsg}, trying next mirror...`);
          console.log(`LibGen search error on ${baseUrl}:`, errorMsg);
          console.log(`Full error:`, error.message);
          console.log(`Search URL was: ${baseUrl}/search.php (params logged above)`);
          continue;
        }
      }

      // If all mirrors fail, return empty results
      options.onStatusUpdate?.('All LibGen mirrors unavailable, returning empty results...');
      return {
        books: [],
        total: 0,
        page,
        limit,
        mirrorStatus: ['All mirrors failed']
      };
    } catch (error) {
      console.error('LibGen search error:', error);
      return {
        books: [],
        total: 0,
        page,
        limit,
        mirrorStatus: ['Search failed with error']
      };
    }
  }

  /**
   * Get mock search results for testing when LibGen is unavailable
   */
  // Keep it in comment since im no longer testing mockdata
  /*private getMockSearchResults(query: string, page: number, limit: number): LibGenSearchResult {
    const mockBooks: LibGenBook[] = [
      {
        id: '1',
        title: `Introduction to ${query}`,
        author: 'John Smith',
        year: '2023',
        pages: '350',
        language: 'English',
        filesize: '5.2 MB',
        extension: 'pdf',
        md5: 'mock-md5-hash-1',
        downloadUrl: 'https://example.com/book1.pdf',
        coverUrl: 'https://example.com/cover1.jpg'
      },
      {
        id: '2',
        title: `Advanced ${query} Techniques`,
        author: 'Jane Doe',
        year: '2022',
        pages: '420',
        language: 'English',
        filesize: '8.1 MB',
        extension: 'pdf',
        md5: 'mock-md5-hash-2',
        downloadUrl: 'https://example.com/book2.pdf',
        coverUrl: 'https://example.com/cover2.jpg'
      },
      {
        id: '3',
        title: `${query} for Beginners`,
        author: 'Bob Johnson',
        year: '2024',
        pages: '280',
        language: 'French',
        filesize: '3.8 MB',
        extension: 'epub',
        md5: 'mock-md5-hash-3',
        downloadUrl: 'https://example.com/book3.epub',
        coverUrl: 'https://example.com/cover3.jpg'
      },
      {
        id: '4',
        title: `Mastering ${query}`,
        author: 'Alice Brown',
        year: '2023',
        pages: '520',
        language: 'English',
        filesize: '12.3 MB',
        extension: 'pdf',
        md5: 'mock-md5-hash-4',
        downloadUrl: 'https://example.com/book4.pdf',
        coverUrl: 'https://example.com/cover4.jpg'
      },
      {
        id: '5',
        title: `${query} Fundamentals`,
        author: 'Carlos Rodriguez',
        year: '2021',
        pages: '390',
        language: 'English',
        filesize: '6.7 MB',
        extension: 'epub',
        md5: 'mock-md5-hash-5',
        downloadUrl: 'https://example.com/book5.epub',
        coverUrl: 'https://example.com/cover5.jpg'
      },
      {
        id: '6',
        title: `${query} in Practice`,
        author: 'Diana Wilson',
        year: '2022',
        pages: '445',
        language: 'French',
        filesize: '9.1 MB',
        extension: 'pdf',
        md5: 'mock-md5-hash-6',
        downloadUrl: 'https://example.com/book6.pdf',
        coverUrl: 'https://example.com/cover6.jpg'
      },
      {
        id: '7',
        title: `Complete Guide to ${query}`,
        author: 'Michael Chen',
        year: '2023',
        pages: '680',
        language: 'English',
        filesize: '15.2 MB',
        extension: 'pdf',
        md5: 'mock-md5-hash-7',
        downloadUrl: 'https://example.com/book7.pdf',
        coverUrl: 'https://example.com/cover7.jpg'
      },
      {
        id: '8',
        title: `${query} Theory and Applications`,
        author: 'Sarah Davis',
        year: '2024',
        pages: '310',
        language: 'English',
        filesize: '4.9 MB',
        extension: 'epub',
        md5: 'mock-md5-hash-8',
        downloadUrl: 'https://example.com/book8.epub',
        coverUrl: 'https://example.com/cover8.jpg'
      }
    ];

    return {
      books: mockBooks,
      total: mockBooks.length,
      page,
      limit
    };
  }
  */

  /**
 * Parse HTML search results from LibGen
 */
private parseSearchResults(html: string, baseUrl: string, format?: string): LibGenBook[] {
  const books: LibGenBook[] = [];
  
  console.log(`=== PARSING DEBUG for ${baseUrl} ===`);
  console.log(`HTML length: ${html.length}`);
  console.log(`HTML starts with: ${html.substring(0, 200)}...`);
  
  try {
    const $ = cheerio.load(html);
    
    // Different mirrors have different HTML structures
    if (baseUrl.includes('libgen.is') || baseUrl.includes('libgen.st')) {
      // Parse libgen.is/libgen.st format
      $('table.c tr').each((index, element) => {
        if (index === 0) return; // Skip header row
        
        const $row = $(element);
        const cells = $row.find('td');
        
        if (cells.length >= 9) {
          const title = cells.eq(2).find('a').text().trim();
          const author = cells.eq(1).text().trim();
          const publisher = cells.eq(3).text().trim(); // Publisher is usually in column 3
          const year = cells.eq(4).text().trim();
          const pages = cells.eq(5).text().trim();
          const language = cells.eq(6).text().trim();
          const filesize = cells.eq(7).text().trim();
          const extension = cells.eq(8).text().trim();
          
          // Debug: Log what we're extracting
          console.log(`=== BOOK PARSING DEBUG ===`);
          console.log(`Title: "${title}"`);
          console.log(`Author: "${author}"`);
          console.log(`Publisher: "${publisher}"`);
          console.log(`Year: "${year}"`);
          console.log(`Pages: "${pages}"`);
          console.log(`Language: "${language}"`);
          console.log(`Filesize: "${filesize}"`);
          console.log(`Extension: "${extension}"`);
          console.log(`Cells count: ${cells.length}`);
          
          // Extract MD5 from download links
          const downloadLink = cells.eq(9).find('a').attr('href');
          const md5Match = downloadLink?.match(/md5=([a-f0-9]{32})/i);
          const md5 = md5Match ? md5Match[1] : '';
          
          // Extract both Book ID and LibGen ID separately
          let bookId = '';
          let libgenId = '';
          
          // Method 1: Extract Book ID from download links (?id=123456) - This is the main book ID
          const downloadIdMatch = downloadLink?.match(/[?&]id=(\d+)/i);
          if (downloadIdMatch) {
            bookId = downloadIdMatch[1];
            console.log(`Book ID found via download link: ${bookId}`);
          }
          
          // Method 2: Extract Book ID from first column (usually contains the main ID)
          if (!bookId) {
            const firstCellText = cells.eq(0).text().trim();
            const firstCellIdMatch = firstCellText.match(/^(\d+)$/);
            if (firstCellIdMatch) {
              bookId = firstCellIdMatch[1];
              console.log(`Book ID found in first column: ${bookId}`);
            }
          }
          
          // Method 3: Extract Book ID from book detail links in any cell
          if (!bookId) {
            for (let i = 0; i < cells.length; i++) {
              const cellHtml = cells.eq(i).html() || '';
              const detailLinkMatch = cellHtml.match(/(?:book\/index\.php|details).*[?&]id=(\d+)/i);
              if (detailLinkMatch) {
                bookId = detailLinkMatch[1];
                console.log(`Book ID found in detail link (cell ${i}): ${bookId}`);
                break;
              }
            }
          }
          
          // Method 4: Extract Book ID from cover image URLs
          if (!bookId) {
            for (let i = 0; i < cells.length; i++) {
              const cellHtml = cells.eq(i).html() || '';
              const coverIdMatch = cellHtml.match(/\/covers\/(\d+)\//i);
              if (coverIdMatch) {
                bookId = coverIdMatch[1];
                console.log(`Book ID found in cover URL (cell ${i}): ${bookId}`);
                break;
              }
            }
          }
          
          // Method 5: Extract Book ID from any link containing id parameter
          if (!bookId) {
            for (let i = 0; i < cells.length; i++) {
              const cellHtml = cells.eq(i).html() || '';
              const anyIdMatch = cellHtml.match(/[?&]id=(\d+)/i);
              if (anyIdMatch) {
                bookId = anyIdMatch[1];
                console.log(`Book ID found in generic link (cell ${i}): ${bookId}`);
                break;
              }
            }
          }
          
          // Now extract LibGen ID (different from Book ID)
          // Look for libgen_id in various places
          for (let i = 0; i < cells.length; i++) {
            const cellHtml = cells.eq(i).html() || '';
            const cellText = cells.eq(i).text().trim();
            
            // Look for libgen_id in attributes or data
            const libgenIdMatch = cellHtml.match(/(?:libgen_id|data-libgen-id)["']?\s*[:=]\s*["']?(\d+)["']?/i);
            if (libgenIdMatch && !libgenId) {
              libgenId = libgenIdMatch[1];
              console.log(`LibGen ID found in cell ${i}: ${libgenId}`);
              break;
            }
          }
          
          // Comprehensive data logging
          console.log(`=== COMPREHENSIVE DATA EXTRACTION ===`);
          console.log(`Book ID: "${bookId}"`);
          console.log(`LibGen ID: "${libgenId}"`);
          console.log(`MD5: "${md5}"`);
          console.log(`Title: "${title}"`);
          console.log(`Author: "${author}"`);
          console.log(`Publisher: "${publisher}"`);
          console.log(`Year: "${year}"`);
          console.log(`Pages: "${pages}"`);
          console.log(`Language: "${language}"`);
          console.log(`Filesize: "${filesize}"`);
          console.log(`Extension: "${extension}"`);
          console.log(`Download Link: "${downloadLink}"`);
          console.log(`=== END DATA EXTRACTION ===`);
          
          // Generate cover URL using correct LibGen pattern
          // LibGen uses first 4 digits of LibGen ID + "0000" for cover directory
          let coverUrl = '';
          if (libgenId && md5) {
            const coverRepoId = libgenId.length >= 4 ? libgenId.substring(0, 4) + '0000' : libgenId;
            coverUrl = `${baseUrl}/covers/${coverRepoId}/${md5}.jpg`;
            console.log(`Generated cover URL with modified LibGen ID: ${libgenId} -> ${coverRepoId}`);
          } else if (md5) {
            // Fallback to old pattern if no LibGen ID
            coverUrl = `${baseUrl}/covers/${md5.charAt(0).toLowerCase()}/${md5}.jpg`;
          }
          
          // Try to extract ISBN from title or other fields
          const titleText = title + ' ' + cells.eq(0).text(); // ID column might have ISBN
          const isbnMatch = titleText.match(/(\d{9}[\dX]|\d{13})/g);
          const isbn = isbnMatch ? isbnMatch[0] : undefined;
          
          if (title && author && (extension.toLowerCase() === 'pdf' || extension.toLowerCase() === 'epub')) {
            books.push({
              id: bookId || md5 || `${index}`, // Use Book ID as main ID, fallback to MD5
              libgen_id: libgenId || '', // LibGen ID for cover URLs
              title,
              author,
              publisher: publisher || undefined,
              year: year || undefined,
              pages: pages || undefined,
              language: language || undefined,
              filesize: filesize || undefined,
              extension: extension.toLowerCase(),
              md5: md5 || undefined,
              isbn: isbn || undefined,
              coverUrl: coverUrl || undefined
            });
          }
        }
      });
    } else if (baseUrl.includes('libgen.li')) {
      console.log('Parsing libgen.li format...');
      const tables = $('table');
      console.log(`Found ${tables.length} tables in the HTML`);
      
      // libgen.li has a different structure - look for the main results table
      $('table tr').each((index, element) => {
        if (index === 0) return; // Skip header row
        
        const $row = $(element);
        const cells = $row.find('td');
        
        console.log(`Row ${index}: ${cells.length} cells`);
        if (cells.length > 0) {
          // Log first few cell contents to understand structure
          for (let i = 0; i < Math.min(cells.length, 5); i++) {
            console.log(`  Cell ${i}: "${cells.eq(i).text().trim().substring(0, 50)}..."`);
          }
        }
        
        // libgen.li has a specific structure based on the logs
        if (cells.length >= 5) {
          // Based on actual libgen.li structure from logs:
          // Cell 0: Title with ISBN info
          // Cell 1: Author
          // Cell 2: Publisher  
          // Cell 3: Year
          // Cell 4: Language
          
          let title = cells.eq(0).text().trim();
          let author = cells.eq(1).text().trim();
          const publisher = cells.eq(2).text().trim();
          const year = cells.eq(3).text().trim();
          const language = cells.eq(4).text().trim();
          
          // Initialize variables for ID extraction
          let bookId = '';
          let libgenId = '';
          let md5 = '';
          let extension = '';
          let coverUrl = '';
          
          // Debug: Log what we're extracting
          console.log(`=== LIBGEN.LI BOOK PARSING DEBUG ===`);
          console.log(`Title: "${title}"`);
          console.log(`Author: "${author}"`);
          // Extract ID, MD5, extension, and cover URL from any cell that contains them
          
          for (let i = 0; i < cells.length; i++) {
            const cellHtml = cells.eq(i).html() || '';
            const cellText = cells.eq(i).text().trim();
            
            // Look for cover_url field in HTML (LibGen specific)
            const coverUrlMatch = cellHtml.match(/cover_url["']?\s*[:=]\s*["']([^"']+)["']/i);
            if (coverUrlMatch && !coverUrl) {
              coverUrl = coverUrlMatch[1];
            }
            
            // Look for cover images in HTML
            const imgMatch = cellHtml.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
            if (imgMatch && !coverUrl) {
              let imgSrc = imgMatch[1];
              // Make sure it's a full URL
              if (imgSrc.startsWith('/')) {
                imgSrc = baseUrl + imgSrc;
              } else if (!imgSrc.startsWith('http')) {
                imgSrc = baseUrl + '/' + imgSrc;
              }
              coverUrl = imgSrc;
            }
            
            // Look for thumbnail or cover links
            const thumbMatch = cellHtml.match(/(?:thumb|cover)[^>]*src=["']([^"']+)["']/i);
            if (thumbMatch && !coverUrl) {
              let thumbSrc = thumbMatch[1];
              if (thumbSrc.startsWith('/')) {
                thumbSrc = baseUrl + thumbSrc;
              } else if (!thumbSrc.startsWith('http')) {
                thumbSrc = baseUrl + '/' + thumbSrc;
              }
              coverUrl = thumbSrc;
            }
            
            // Extract both Book ID and LibGen ID for libgen.li
            if (!bookId) {
              // Method 1: From id attributes or parameters - This is Book ID
              const idMatch = cellHtml.match(/(?:id["']?\s*[:=]\s*["']?(\d+)["']?|\bid=(\d+))/i);
              if (idMatch) {
                bookId = idMatch[1] || idMatch[2];
                console.log(`Book ID found via id attribute (libgen.li): ${bookId}`);
              }
            }
            
            if (!bookId) {
              // Method 2: From download/detail links - This is Book ID
              const linkIdMatch = cellHtml.match(/[?&]id=(\d+)/i);
              if (linkIdMatch) {
                bookId = linkIdMatch[1];
                console.log(`Book ID found via link parameter (libgen.li): ${bookId}`);
              }
            }
            
            if (!bookId) {
              // Method 3: From cover URLs - This is Book ID
              const coverIdMatch = cellHtml.match(/\/covers\/(\d+)\//i);
              if (coverIdMatch) {
                bookId = coverIdMatch[1];
                console.log(`Book ID found via cover URL (libgen.li): ${bookId}`);
              }
            }
            
            if (!bookId) {
              // Method 4: From book detail page links - This is Book ID
              const detailIdMatch = cellHtml.match(/(?:book\/index\.php|details).*[?&]id=(\d+)/i);
              if (detailIdMatch) {
                bookId = detailIdMatch[1];
                console.log(`Book ID found via detail link (libgen.li): ${bookId}`);
              }
            }
            
            // Now look for LibGen ID (separate from Book ID)
            if (!libgenId) {
              // Look for libgen_id in attributes or data
              const libgenIdMatch = cellHtml.match(/(?:libgen_id|data-libgen-id|libgen-id)["']?\s*[:=]\s*["']?(\d+)["']?/i);
              if (libgenIdMatch) {
                libgenId = libgenIdMatch[1];
                console.log(`LibGen ID found in libgen.li cell: ${libgenId}`);
              }
            }
            
            // Look for MD5 hashes (32 character hex strings)
            const md5Match = cellHtml.match(/([a-f0-9]{32})/i);
            if (md5Match && !md5) {
              md5 = md5Match[1];
            }
            
            // Look for file extensions
            if (cellText.toLowerCase().includes('pdf') || cellHtml.toLowerCase().includes('pdf')) {
              extension = 'pdf';
            } else if (cellText.toLowerCase().includes('epub') || cellHtml.toLowerCase().includes('epub')) {
              extension = 'epub';
            }
          }
          
          // If no cover found, try LibGen's correct cover URL patterns
          if (!coverUrl && bookId && md5) {
            // LibGen uses first 4 digits of Repository ID + "0000" for cover directory
            const coverRepoId = bookId.length >= 4 ? bookId.substring(0, 4) + '0000' : bookId;
            const patterns = [
              `${baseUrl}/covers/${coverRepoId}/${md5}.jpg`,
              `https://libgen.li/covers/${coverRepoId}/${md5}.jpg`,
              `https://libgen.is/covers/${coverRepoId}/${md5}.jpg`,
              `https://libgen.st/covers/${coverRepoId}/${md5}.jpg`
            ];
            
            // Use the first pattern as default (most common)
            coverUrl = patterns[0];
            console.log(`Generated cover URL (libgen.li) with modified repo ID: ${bookId} -> ${coverRepoId}`);
          } else if (!coverUrl && md5) {
            // Fallback to old pattern if no ID found
            coverUrl = `${baseUrl}/covers/${md5.charAt(0).toLowerCase()}/${md5}.jpg`;
          }
          
          // Extract ISBN from title
          const isbnMatch = title.match(/(\d{9}[\dX]|\d{13})/g);
          const isbn = isbnMatch ? isbnMatch[0] : undefined;
          
          // Use title as author if no separate author found
          if (!author && title) {
            author = title.split(/[;,]|by\s+/i)[0].trim();
          }
          
          // Comprehensive data logging for libgen.li
          console.log(`=== COMPREHENSIVE DATA EXTRACTION (libgen.li) ===`);
          console.log(`Book ID: "${bookId}"`);
          console.log(`LibGen ID: "${libgenId}"`);
          console.log(`MD5: "${md5}"`);
          console.log(`Title: "${title}"`);
          console.log(`Author: "${author}"`);
          console.log(`Publisher: "${publisher}"`);
          console.log(`Year: "${year}"`);
          console.log(`Language: "${language}"`);
          console.log(`Extension: "${extension}"`);
          console.log(`Cover URL: "${coverUrl}"`);
          console.log(`=== END DATA EXTRACTION (libgen.li) ===`);
          
          // Apply format filter if specified
          const formatMatches = !format || format === 'all' || extension.toLowerCase() === format.toLowerCase();
          
          if (title && title.length > 3 && (extension === 'pdf' || extension === 'epub') && md5 && formatMatches) {
            books.push({
              id: bookId || md5, // Use Book ID as main ID, fallback to MD5
              libgen_id: libgenId || '', // LibGen ID for cover URLs
              title,
              author: author || 'Unknown Author',
              publisher: publisher || undefined,
              year: year || undefined,
              pages: undefined, // Not available in libgen.li format
              language: language || undefined,
              filesize: undefined, // Not available in libgen.li format
              extension: extension,
              md5: md5,
              isbn: isbn || undefined,
              coverUrl: coverUrl || undefined
            });
            console.log(`✓ Added book: ${title}`);
          }
        }
      });
    } else {
      // Parse gen.lib.rus.ec and libgen.rs format
      $('table.c tr, table tr').each((index, element) => {
        if (index === 0) return; // Skip header row
        
        const $row = $(element);
        const cells = $row.find('td');
        
        if (cells.length >= 9) {
          const title = cells.eq(2).find('a').text().trim() || cells.eq(2).text().trim();
          const author = cells.eq(1).text().trim();
          const year = cells.eq(4).text().trim();
          const pages = cells.eq(5).text().trim();
          const language = cells.eq(6).text().trim();
          const filesize = cells.eq(7).text().trim();
          const extension = cells.eq(8).text().trim();
          
          // Extract MD5 from download links
          const downloadLink = cells.eq(9).find('a').attr('href') || cells.find('a').attr('href');
          const md5Match = downloadLink?.match(/md5=([a-f0-9]{32})/i);
          const md5 = md5Match ? md5Match[1] : '';
          
          if (title && author && (extension.toLowerCase() === 'pdf' || extension.toLowerCase() === 'epub')) {
            books.push({
              id: md5 || `${index}`,
              libgen_id: '', // No LibGen ID available in this parsing section
              title,
              author,
              year: year || undefined,
              pages: pages || undefined,
              language: language || undefined,
              filesize: filesize || undefined,
              extension: extension.toLowerCase(),
              md5: md5 || undefined
            });
          }
        }
      });
    }
    
    console.log(`Parsed ${books.length} books from ${baseUrl}`);
    
    // Remove duplicates based on MD5 hash
    const uniqueBooks = books.filter((book, index, self) => 
      index === self.findIndex(b => b.md5 === book.md5)
    );
    
    console.log(`After removing duplicates: ${uniqueBooks.length} unique books`);
    
    // Sort books by year (latest first), then by relevance (original order)
    const sortedBooks = uniqueBooks.sort((a, b) => {
      const yearA = a.year ? parseInt(a.year) : 0;
      const yearB = b.year ? parseInt(b.year) : 0;
      
      // If both have years, sort by year descending (latest first)
      if (yearA && yearB) {
        return yearB - yearA;
      }
      
      // If only one has a year, prioritize the one with a year
      if (yearA && !yearB) return -1;
      if (!yearA && yearB) return 1;
      
      // If neither has a year, maintain original order (relevance)
      return 0;
    });
    
    console.log(`After sorting: ${sortedBooks.length} books (latest first)`);
    
    // Debug: Log first few books to see what we're getting
    if (sortedBooks.length > 0) {
      const firstBook = sortedBooks[0];
      console.log('First book parsed (after sorting):', {
        title: firstBook.title,
        author: firstBook.author,
        year: firstBook.year,
        md5: firstBook.md5,
        extension: firstBook.extension
      });
    }
    
    return sortedBooks;
    
  } catch (error) {
    console.error('Error parsing LibGen results:', error);
    // Return empty array instead of mock data
    return [];
  }
}

  /**
   * Get download links for a specific book
   */
  async getDownloadLinks(md5: string): Promise<string[]> {
    const downloadLinks: string[] = [];

    for (const mirror of this.downloadMirrors) {
      try {
        // Different mirrors have different URL patterns
        if (mirror.includes('library.lol')) {
          downloadLinks.push(`${mirror}/main/${md5}`);
        } else if (mirror.includes('libgen.li')) {
          // Extract actual download URL from ads page
          const actualUrl = await this.extractActualDownloadUrl(`${mirror}/ads.php?md5=${md5}`);
          if (actualUrl) {
            downloadLinks.push(actualUrl);
          }
        } else {
          downloadLinks.push(`${mirror}/book/index.php?md5=${md5}`);
        }
      } catch (error) {
        console.log(`Failed to get download link from ${mirror}`);
      }
    }

    return downloadLinks;
  }

  /**
   * Extract actual download URL with key from LibGen ads page
   */
  private async extractActualDownloadUrl(adsUrl: string): Promise<string | null> {
    try {
      console.log(`Extracting actual download URL from: ${adsUrl}`);
      
      const response = await axios.get(adsUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Connection': 'keep-alive'
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
          keepAlive: true
        }),
        maxRedirects: 5
      });

      const $ = cheerio.load(response.data);
      let actualDownloadUrl: string | null = null;
      
      // Method 1: Look for GET button with get.php?md5=...&key=...
      $('a[href*="get.php"]').each((index, element) => {
        const href = $(element).attr('href');
        if (href && href.includes('key=') && href.includes('md5=')) {
          const baseUrl = adsUrl.split('/ads.php')[0];
          actualDownloadUrl = href.startsWith('/') ? baseUrl + href : 
                             href.startsWith('http') ? href : baseUrl + '/' + href;
          console.log(`✓ Found GET link: ${actualDownloadUrl}`);
          return false; // Break loop
        }
      });
      
      // Method 2: Look for any link with key parameter
      if (!actualDownloadUrl) {
        $('a[href*="key="]').each((index, element) => {
          const href = $(element).attr('href');
          if (href && href.includes('md5=')) {
            const baseUrl = adsUrl.split('/ads.php')[0];
            actualDownloadUrl = href.startsWith('/') ? baseUrl + href : 
                               href.startsWith('http') ? href : baseUrl + '/' + href;
            console.log(`✓ Found key link: ${actualDownloadUrl}`);
            return false;
          }
        });
      }
      
      // Method 3: Look in button onclick events
      if (!actualDownloadUrl) {
        $('button, input[type="button"], input[type="submit"]').each((index, element) => {
          const onclick = $(element).attr('onclick');
          if (onclick) {
            const urlMatch = onclick.match(/(?:location\.href|window\.open)\s*=\s*['"]([^'"]+get\.php[^'"]*key=[^'"]+)['"]/) ||
                           onclick.match(/['"]([^'"]*get\.php[^'"]*key=[^'"]+)['"]/);
            if (urlMatch) {
              let url = urlMatch[1];
              const baseUrl = adsUrl.split('/ads.php')[0];
              actualDownloadUrl = url.startsWith('/') ? baseUrl + url : 
                                 url.startsWith('http') ? url : baseUrl + '/' + url;
              console.log(`✓ Found onclick link: ${actualDownloadUrl}`);
              return false;
            }
          }
        });
      }
      
      if (actualDownloadUrl) {
        console.log(`✅ Successfully extracted download URL: ${actualDownloadUrl}`);
        return actualDownloadUrl;
      } else {
        console.log(`❌ Could not find download URL in ads page`);
        return null;
      }
      
    } catch (error: any) {
      console.error(`Error extracting download URL from ${adsUrl}:`, error.message);
      return null;
    }
  }

  /**
   * Download a book file and save it to the server
   */
  async downloadBook(downloadUrl: string, bookInfo: LibGenBook): Promise<string> {
    try {
      const response = await axios.get(downloadUrl, {
        responseType: 'stream',
        timeout: 60000, // 1 minute timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false // Accept self-signed certificates
        })
      });

      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedTitle = bookInfo.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      const filename = `${timestamp}-${sanitizedTitle}.${bookInfo.extension || 'pdf'}`;
      
      // Ensure uploads directory exists
      const uploadsDir = path.join(process.cwd(), 'uploads', 'books');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, filename);
      const writer = fs.createWriteStream(filePath);

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          resolve(`/uploads/books/${filename}`);
        });
        writer.on('error', reject);
      });
    } catch (error) {
      console.error('Book download error:', error);
      throw new Error('Failed to download book');
    }
  }

  /**
   * Import a LibGen book into the local database
   */
  async importBook(libgenBook: LibGenBook, categoryId: string, downloadedFilePath: string) {
    // Map LibGen language names to our language codes
    const languageMap: { [key: string]: string } = {
      'english': 'en',
      'français': 'fr',
      'french': 'fr',
      'العربية': 'ar',
      'arabic': 'ar',
      'arabe': 'ar'
    };

    // Get language code from LibGen language, default to 'en'
    const libgenLanguage = (libgenBook.language || 'English').toLowerCase();
    const mappedLanguage = languageMap[libgenLanguage] || 'en';

    // This would integrate with your existing Book model
    const bookData = {
      title: libgenBook.title,
      author: libgenBook.author,
      description: `Imported from LibGen. Year: ${libgenBook.year}, Pages: ${libgenBook.pages}`,
      category: categoryId,
      language: mappedLanguage,
      publicationYear: libgenBook.year ? parseInt(libgenBook.year) : undefined,
      format: (libgenBook.extension?.toLowerCase() === 'epub' ? 'epub' : 'pdf') as 'pdf' | 'epub',
      filePath: downloadedFilePath,
      isDownloadable: true,
      physicalCopies: 0,
      availableCopies: 0,
      // You might want to download and save the cover image too
      coverImage: libgenBook.coverUrl
    };

    return bookData;
  }

  /**
   * Get book details by MD5 hash
   */
  async getBookDetails(md5: string): Promise<LibGenBook | null> {
    try {
      for (const baseUrl of this.baseUrls) {
        try {
          const detailUrl = `${baseUrl}/book/index.php?md5=${md5}`;
          const response = await axios.get(detailUrl, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            httpsAgent: new https.Agent({
              rejectUnauthorized: false // Accept self-signed certificates
            })
          });

          // Parse book details from HTML (simplified)
          return this.parseBookDetails(response.data, md5);
        } catch (error) {
          continue;
        }
      }
      return null;
    } catch (error) {
      console.error('Get book details error:', error);
      return null;
    }
  }

  private parseBookDetails(html: string, md5: string): LibGenBook {
    // This would need proper HTML parsing
    // For now, return a mock structure
    return {
      id: md5,
      title: 'Book Title',
      author: 'Book Author',
      md5: md5,
      // ... other details would be parsed from HTML
    };
  }
}

export default new LibGenService();
