process.env.NODE_ENV = 'test'
const request = require('supertest');
const app = require('../app');
const db = require('../db');

let test_isbn;

beforeEach(async () => {
  let result = await db.query(`
    INSERT INTO books (isbn, amazon_url, author, language, pages, publisher, title, year)   
      VALUES(
        '999', 'https://amazon.com/testbook', 
        'test author', 'English', 999,  
        'test publisher', 'test book', 2021) 
        RETURNING isbn`);
  test_isbn = result.rows[0].isbn
});

afterEach(async function () {
  await db.query('DELETE FROM books');
});

afterAll(async function () {
  await db.end()
});

describe('POST /books', async function () {
  test('It should create a book', async function () {
    const response = await request(app)
        .post(`/books`)
        .send({
          isbn: '888', amazon_url: 'https://amazon.com/testbook2',
          author: 'test author 2', language: 'English', pages: 999,
          publisher: 'test publisher 2', title: 'test book 2', year: 2021});
    expect(response.statusCode).toBe(201);
    expect(response.body.book).toHaveProperty('isbn');
  });

  test('It should prevent creating a book with missing information', async function () {
    const response = await request(app)
        .post(`/books`)
        .send({isbn: '123'});
    expect(response.statusCode).toBe(400);
  });

  test('It should prevent creating a book with the wrong form of information', async function () {
    const response = await request(app)
        .post(`/books`)
        .send({
          isbn: 2, amazon_url: 'https://amazon.com/testbook3',
          author: 'test author 3', language: 'English', pages: 999,
          publisher: 'test publisher 3', title: 'test book 3', year: 2021});
    expect(response.statusCode).toBe(400);
  });
});

describe('GET /books', async function () {
  test('It should get all books', async function () {
    const response = await request(app).get(`/books`);
    const books = response.body.books;
    expect(books).toHaveLength(1);
    expect(books[0]).toHaveProperty('isbn');
  });
});

describe('GET /books/:isbn', async function () {
  test('It should get a single book', async function () {
    const response = await request(app).get(`/books/${test_isbn}`)
    expect(response.body.book.isbn).toBe(test_isbn);
  });

  test('It should return 404 for a not found book', async function () {
    const response = await request(app).get(`/books/1`)
    expect(response.statusCode).toBe(404);
  });
});

describe('PUT /books/:id', async function () {
  test('It should update a book', async function () {
    const response = await request(app)
        .put(`/books/${test_isbn}`)
        .send({
          amazon_url: 'https://amazon.com/testbook',
          author: 'updated test author', language: 'English', pages: 999,
          publisher: 'updated test publisher', title: 'updated test book', year: 2021});
    expect(response.body.book.title).toBe('updated test book');
  });

  test('It should prevent updating a book with missing information', async function () {
    const response = await request(app)
        .put(`/books/${test_isbn}`)
        .send({
          amazon_url: 'https://amazon.com/testbook', author: 'updated test author', 
          language: 'English', pages: 999, publisher: 'updated test publisher'});
    expect(response.statusCode).toBe(400);
  });

  test('It should prevent updating a book with incorrect information', async function () {
    const response = await request(app)
        .put(`/books/${test_isbn}`)
        .send({
          isbn: 'This should not be here', amazon_url: 'https://amazon.com/testbook',
          author: 'updated test author', language: 'English', pages: 999,
          publisher: 'updated test publisher', title: 'updated test book', year: 2021});
    expect(response.statusCode).toBe(400);
  });
});

describe('DELETE /books/:id', function () {
  test('It should delete a book', async function () {
    const response = await request(app).delete(`/books/${test_isbn}`)
    expect(response.body).toEqual({message: 'Book deleted'});
  });

  test('It should return 404 for a not found book', async function () {
    const response = await request(app).delete(`/books/1`);
    expect(response.statusCode).toBe(404);
  });
});