import { uploadOnCloudinary } from './src/utils/cloudinary.js';
import fs from 'fs';

async function testCloudinary() {
  const testFile = 'test_image.txt';
  fs.writeFileSync(testFile, 'This is a test file for Cloudinary');

  console.log('Testing Cloudinary upload...');
  const result = await uploadOnCloudinary(testFile);

  if (result) {
    console.log('Upload successful!');
    console.log('URL:', result.secure_url);
  } else {
    console.log('Upload failed.');
  }
}

testCloudinary();
