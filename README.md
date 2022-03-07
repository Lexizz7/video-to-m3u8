
# Video to HLS M3U8 (Stream format)

  

This project aims to automate and facilitate the process of converting many videos files into multiple resolutions, bitrates, audio bitrates, stream segments and video thumbnails.

![Example](/.github/banner2.png)

## Dependencies

  

To run this script you need to install locally on your machine the following dependencies:

  

- Node.js;

- FFmpeg;

- Google ZX (https://github.com/google/zx);

  

## Running locally

  

1. Install dependencies

2. Clone this repository
3. ```npm i || yarn```

Configure `convert.mjs`
Default:
```
const  options = {
	thumbnail:  true,
	thumbnailTime:  20, // Percentage of the video
	
	previewThumbnails:  true,
	previewThumbnailsInterval:  5, // Time in seconds
	previewThumbnailsRes:  '144', // Height in pixels
	previewThumbnailsLayout:  '5x5', // Layout of the preview thumbnails
	
	thumbnailsExtension:  'jpg',
	
	videoRes: ['1080', '720', '480', '360', '240'],
	audioBitrate: { // Audio bitrate depends on video resolution
	'1080':  '192k',
	'720':  '192k',
	'480':  '128k',
	'360':  '128k',
	'240':  '96k'
	},
	videoMaxBitrate: {
	'1080':  '8M',
	'720':  '5M',
	'480':  '2.5M',
	'360':  '1M',
	'240':  '500k'
	},
	videoBufferSize: { // Try to keep videoMaxBitrate/videoBufferSize ratio <= 1 && >= 2 (default: 1)
	'1080':  '8M',
	'720':  '5M',
	'480':  '2.5M',
	'360':  '1M',
	'240':  '500k'
	},
	audioFrequency:  '44100',
	
	segmentTime:  2, // Time in seconds
	crf:  21, // Constant rate factor: https://trac.ffmpeg.org/wiki/Encode/H.264
	preset:  'veryfast', // Slower values increases time to encode and decrease file size: https://trac.ffmpeg.org/wiki/Encode/H.264#Presets
	threads:  0, // Number of threads to use. 0 means auto
}
```

4. Add your videos on input folder (if isn't, create one)
5. ```npm start || yarn start```
  

## Features

  

- [x] Convert to multiple resolutions

- [x] Convert to multiple audio bitrates

- [x] Create thumbnail based on percentage of the video

- [x] Create preview thumbnails every X time

- [x] Convert many inputs at once

- [x] Create master playlist

- [ ] Add dub/secondary audio source
