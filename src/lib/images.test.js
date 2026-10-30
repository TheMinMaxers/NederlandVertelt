import test from 'node:test'
import assert from 'node:assert/strict'
import { imageUrls, imageSource, safeUrl, thumbnail } from './images.js'

test('reads multiple distinct P18 images and rejects unsafe URLs', () => {
  assert.deepEqual(imageUrls({ images: { value: 'http://commons.wikimedia.org/wiki/Special:FilePath/Test.jpg|https://example.org/second.jpg|javascript:alert(1)|https://example.org/second.jpg' } }), [
    'https://commons.wikimedia.org/wiki/Special:FilePath/Test.jpg', 'https://example.org/second.jpg',
  ])
  assert.deepEqual(imageUrls({}), [])
  assert.equal(safeUrl('javascript:alert(1)'), null)
})

test('requests resized Commons images and links to file attribution', () => {
  const image = 'http://commons.wikimedia.org/wiki/Special:FilePath/Zeeland%20bridge.jpg'
  assert.equal(thumbnail(image, 600), 'https://commons.wikimedia.org/wiki/Special:FilePath/Zeeland%20bridge.jpg?width=600')
  assert.equal(imageSource(image), 'https://commons.wikimedia.org/wiki/File:Zeeland%20bridge.jpg')
})
