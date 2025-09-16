import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { User } from '../models/User.js';
import { Category } from '../models/Category.js';
import { Book } from '../models/Book.js';
import { Borrowing } from '../models/Borrowing.js';
import bcrypt from 'bcryptjs';

const seedDatabase = async () => {
  try {
    console.log('🔌 Connecting to database...');
    await connectDatabase();
    console.log('✅ Database connected successfully');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Category.deleteMany({});
    await Book.deleteMany({});
    await Borrowing.deleteMany({});
    console.log('✅ Existing data cleared');

    // Create users
    console.log('👥 Creating users...');
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    const users = [
      {
        firstname: 'Ahmed',
        lastname: 'Benali',
        email: 'student@bibliodz.dz',
        password: hashedPassword,
        role: 'student',
        isActive: true
      },
      {
        firstname: 'Fatima',
        lastname: 'Khelifi',
        email: 'teacher@bibliodz.dz',
        password: hashedPassword,
        role: 'teacher',
        isActive: true
      },
      {
        firstname: 'Omar',
        lastname: 'Boudiaf',
        email: 'staff@bibliodz.dz',
        password: hashedPassword,
        role: 'staff',
        isActive: true
      }
    ];

    const createdUsers = await User.insertMany(users);
    console.log(`✅ Created ${createdUsers.length} users`);

    // Create categories
    console.log('📂 Creating categories...');
    const categories = [
      { 
        name: 'Sciences', 
        slug: 'sciences',
        description: 'Sciences et technologies' 
      },
      { 
        name: 'Littérature', 
        slug: 'litterature',
        description: 'Littérature et langues' 
      },
      { 
        name: 'Histoire', 
        slug: 'histoire',
        description: 'Histoire et géographie' 
      }
    ];

    const createdCategories = await Category.insertMany(categories);
    console.log(`✅ Created ${createdCategories.length} categories`);

    // Create subcategories
    console.log('📁 Creating subcategories...');
    const scienceCategory = createdCategories.find(cat => cat.name === 'Sciences');
    const subcategories = [
      {
        name: 'Informatique',
        slug: 'informatique',
        parent: scienceCategory?._id,
        description: 'Informatique et programmation'
      },
      {
        name: 'Mathématiques',
        slug: 'mathematiques',
        parent: scienceCategory?._id,
        description: 'Mathématiques appliquées'
      }
    ];

    const createdSubcategories = await Category.insertMany(subcategories);
    console.log(`✅ Created ${createdSubcategories.length} subcategories`);

    // Create books
    console.log('📚 Creating books...');
    const informatique = createdSubcategories.find(cat => cat.name === 'Informatique');
    const books = [
      {
        title: 'Introduction à Python',
        author: 'Jean Dupont',
        isbn: '9782123456789',
        description: 'Guide complet pour apprendre Python',
        category: scienceCategory?._id,
        subcategory: informatique?._id,
        language: 'fr',
        format: 'pdf',
        publicationYear: 2023,
        publisher: 'Éditions Tech',
        pages: 350,
        filePath: '/uploads/books/python-intro.pdf',
        physicalCopies: 5,
        availableCopies: 5,
        isDownloadable: true
      },
      {
        title: 'Algorithmes et Structures de Données',
        author: 'Marie Martin',
        isbn: '9782987654321',
        description: 'Concepts fondamentaux des algorithmes',
        category: scienceCategory?._id,
        subcategory: informatique?._id,
        language: 'fr',
        format: 'epub',
        publicationYear: 2022,
        publisher: 'Presses Universitaires',
        pages: 420,
        filePath: '/uploads/books/algorithms.epub',
        physicalCopies: 3,
        availableCopies: 2,
        isDownloadable: true
      },
      {
        title: 'Machine Learning Fundamentals',
        author: 'Ahmed Benali',
        isbn: '9782555511112',
        description: 'Introduction au machine learning',
        category: scienceCategory?._id,
        subcategory: informatique?._id,
        language: 'en',
        format: 'pdf',
        publicationYear: 2024,
        publisher: 'AI Press',
        pages: 280,
        filePath: '/uploads/books/ml-fundamentals.pdf',
        physicalCopies: 4,
        availableCopies: 4,
        isDownloadable: true
      }
    ];

    const createdBooks = await Book.insertMany(books);
    console.log(`✅ Created ${createdBooks.length} books`);

    // Create borrowings
    console.log('📋 Creating borrowings...');
    const student = createdUsers.find(user => user.role === 'student');
    const borrowings = [
      {
        user: student?._id,
        book: createdBooks[0]?._id,
        borrowDate: new Date(),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: 'active',
        renewalCount: 0
      }
    ];

    const createdBorrowings = await Borrowing.insertMany(borrowings);
    console.log(`✅ Created ${createdBorrowings.length} borrowings`);

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Users: ${createdUsers.length}`);
    console.log(`   Categories: ${createdCategories.length}`);
    console.log(`   Subcategories: ${createdSubcategories.length}`);
    console.log(`   Books: ${createdBooks.length}`);
    console.log(`   Borrowings: ${createdBorrowings.length}`);
    
    console.log('\n🔐 Test Accounts:');
    console.log('   Student: student@bibliodz.dz / password123');
    console.log('   Teacher: teacher@bibliodz.dz / password123');
    console.log('   Staff: staff@bibliodz.dz / password123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    process.exit(1);
  } finally {
    console.log('🔌 Disconnecting from database...');
    await disconnectDatabase();
    console.log('✅ Database disconnected');
  }
};

// Run seeder
seedDatabase().catch(console.error);
