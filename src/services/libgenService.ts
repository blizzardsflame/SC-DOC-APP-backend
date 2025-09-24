import axios from 'axios';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import https from 'https';
import * as cheerio from 'cheerio';

interface LibGenBook {
  id: string;
  title: string;
  author: string;
  year?: string;
  pages?: string;
  language?: string;
  filesize?: string;
  extension?: string;
  md5?: string;
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
  async searchBooks(query: string, page: number = 1, limit: number = 25, options: SearchOptions = {}): Promise<LibGenSearchResult> {
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
              lg_topic: 'libgen',
              open: '0',
              view: 'simple',
              res: limit.toString(),
              sort: 'def',
              sortmode: 'ASC',
              page: page.toString()
            };
          } else if (baseUrl.includes('libgen.li')) {
            // libgen.li uses a different URL structure
            searchUrl = `${baseUrl}/index.php`;
            params = {
              req: query,
              lg_topic: 'libgen',
              open: '0',
              view: 'simple',
              res: limit.toString(),
              sort: 'def',
              sortmode: 'ASC',
              page: page.toString()
            };
          } else if (baseUrl.includes('gen.lib.rus.ec')) {
            // gen.lib.rus.ec uses search.php
            searchUrl = `${baseUrl}/search.php`;
            params = {
              req: query,
              lg_topic: 'libgen',
              open: '0',
              view: 'simple',
              res: limit.toString(),
              sort: 'def',
              sortmode: 'ASC',
              page: page.toString()
            };
          } else {
            // For libgen.rs and others
            searchUrl = `${baseUrl}/search.php`;
            params = {
              req: query,
              lg_topic: 'libgen',
              open: '0',
              view: 'simple',
              res: limit.toString(),
              sort: 'def',
              sortmode: 'ASC',
              page: page.toString()
            };
          }

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

          options.onStatusUpdate?.(`Successfully connected to ${baseUrl}, parsing results...`);
          
          // Debug: Log the HTML response size and first 500 characters
          console.log(`HTML response size: ${response.data.length} characters`);
          console.log(`HTML preview: ${response.data.substring(0, 500)}...`);
          
          const books = this.parseSearchResults(response.data, baseUrl);
          
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
private parseSearchResults(html: string, baseUrl: string): LibGenBook[] {
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
          const year = cells.eq(4).text().trim();
          const pages = cells.eq(5).text().trim();
          const language = cells.eq(6).text().trim();
          const filesize = cells.eq(7).text().trim();
          const extension = cells.eq(8).text().trim();
          
          // Extract MD5 from download links
          const downloadLink = cells.eq(9).find('a').attr('href');
          const md5Match = downloadLink?.match(/md5=([a-f0-9]{32})/i);
          const md5 = md5Match ? md5Match[1] : '';
          
          if (title && author && (extension.toLowerCase() === 'pdf' || extension.toLowerCase() === 'epub')) {
            books.push({
              id: md5 || `${index}`,
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
        
        // Try to find book data - libgen.li structure might be different
        if (cells.length >= 5) {
          // Attempt to extract book info - adjust indices based on actual structure
          let title = '';
          let author = '';
          let extension = '';
          let md5 = '';
          
          // Try different cell positions for title
          for (let i = 0; i < cells.length; i++) {
            const cellText = cells.eq(i).text().trim();
            const cellHtml = cells.eq(i).html() || '';
            
            // Look for titles (usually longer text with book-like content)
            if (cellText.length > 10 && cellText.length < 200 && 
                !cellText.includes('Libgen') && !cellText.includes('Sci-Hub') &&
                !cellText.match(/^\d+$/) && !cellText.match(/^\d+\.\d+\s*(MB|KB|GB)$/i)) {
              if (!title || cellText.length > title.length) {
                title = cellText;
              }
            }
            
            // Look for MD5 hashes (32 character hex strings)
            const md5Match = cellHtml.match(/([a-f0-9]{32})/i);
            if (md5Match && !md5) {
              md5 = md5Match[1];
            }
            
            // Look for file extensions
            if (cellText.toLowerCase().includes('.pdf') || cellText.toLowerCase().includes('pdf')) {
              extension = 'pdf';
            } else if (cellText.toLowerCase().includes('.epub') || cellText.toLowerCase().includes('epub')) {
              extension = 'epub';
            }
          }
          
          // Use title as author if no separate author found
          if (!author && title) {
            author = title.split(/[;,]|by\s+/i)[0].trim();
          }
          
          console.log(`Extracted - Title: "${title}", Author: "${author}", MD5: "${md5}", Extension: "${extension}"`);
          
          if (title && title.length > 3 && (extension === 'pdf' || extension === 'epub') && md5) {
            books.push({
              id: md5,
              title,
              author: author || 'Unknown Author',
              md5: md5,
              extension: extension,
              year: undefined,
              pages: undefined,
              language: undefined,
              filesize: undefined
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
    
    // Debug: Log first few books to see what we're getting
    if (uniqueBooks.length > 0) {
      const firstBook = uniqueBooks[0];
      console.log('First book parsed:', {
        title: firstBook.title,
        author: firstBook.author,
        md5: firstBook.md5,
        extension: firstBook.extension
      });
    }
    
    return uniqueBooks;
    
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
          downloadLinks.push(`${mirror}/ads.php?md5=${md5}`);
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
    // This would integrate with your existing Book model
    const bookData = {
      title: libgenBook.title,
      author: libgenBook.author,
      description: `Imported from LibGen. Year: ${libgenBook.year}, Pages: ${libgenBook.pages}`,
      category: categoryId,
      language: libgenBook.language || 'English',
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
