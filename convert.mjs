#!/usr/bin/env zx
import { startSpinner } from 'zx/experimental'

const fs = require('fs')
const inputFolder = './input/'

const options = {
    thumbnail: true,
    thumbnailTime: 20, // Percentage of the video

    previewThumbnails: true,
    previewThumbnailsInterval: 5, // Time in seconds
    previewThumbnailsRes: '144', // Height in pixels
    previewThumbnailsLayout: '5x5', // Layout of the preview thumbnails

    thumbnailsExtension: 'jpg',

    videoRes: ['1080', '720', '480', '360', '240'],
    audioBitrate: { // Audio bitrate depends on video resolution
        '1080': '192k',
        '720': '192k',
        '480': '128k',
        '360': '128k',
        '240': '96k'
    },
    videoMaxBitrate: {
        '1080': '8M',
        '720': '5M',
        '480': '2.5M',
        '360': '1M',
        '240': '500k'
    },
    videoBufferSize: { // Try to keep videoMaxBitrate/videoBufferSize ratio <= 1 && >= 2 (default: 1)
        '1080': '8M',
        '720': '5M',
        '480': '2.5M',
        '360': '1M',
        '240': '500k'
    },
    audioFrequency: '44100',

    segmentTime: 2, // Time in seconds
    crf: 21, // Constant rate factor: https://trac.ffmpeg.org/wiki/Encode/H.264
    preset: 'veryfast', // Slower values increases time to encode and decrease file size: https://trac.ffmpeg.org/wiki/Encode/H.264#Presets
    threads: 0, // Number of threads to use. 0 means auto
}

const stop = startSpinner()
fs.readdir(inputFolder, (err, files) => {
    files.forEach(async (file) => {
        const input = inputFolder + file
        console.log(`Processing ${file}`)

        const inputDuration = await quiet($`ffprobe -v error -hide_banner -loglevel error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${input}`)
        console.log(`Video duration: ${parseInt(inputDuration)} seconds`)

        const outputFolder = `./output/${file.replace(/\.[^/.]+$/, "")}`
        if (!fs.existsSync(outputFolder)) fs.mkdirSync(outputFolder)

        const thumbnailsDir = outputFolder + '/thumbnails'
        if (!fs.existsSync(thumbnailsDir)) fs.mkdirSync(thumbnailsDir)

        const thumbnailTime = inputDuration * options.thumbnailTime / 100
        console.log(`Creating main thumbnail. Time: ${thumbnailTime}`)
        quiet($`ffmpeg -y -hide_banner -loglevel error -ss ${thumbnailTime} -i ${input} -frames:v 1 ${thumbnailsDir}/main.${options.thumbnailsExtension}`).then(() => {
            console.log(`Main thumbnail created`)
        })

        console.log(`Creating preview thumbnails every ${options.previewThumbnailsInterval} seconds`)
        quiet($`ffmpeg -y -hide_banner -loglevel error -i ${input} -vf "select='isnan(prev_selected_t)+gte(t-prev_selected_t\,${options.previewThumbnailsInterval})',scale=-2:${options.previewThumbnailsRes},tile=layout=${options.previewThumbnailsLayout}" -vsync vfr -q:v 2 ${thumbnailsDir}/preview_thumb%03d.${options.thumbnailsExtension}`).then(() => {
            console.log(`Preview thumbnails created`)
        })

        const bandwidths = {}

        console.log(`Creating video segments`)

        new Promise((resolve, reject) => {
            let i = 0
            options.videoRes.forEach(async (res) => {
                const videoFolder = outputFolder + '/' + res + 'p'
                if (!fs.existsSync(videoFolder)) fs.mkdirSync(videoFolder)

                const audioBitrate = options.audioBitrate[res]
                const videoMaxBitrate = options.videoMaxBitrate[res]
                const videoBufferSize = options.videoBufferSize[res]

                quiet($`ffmpeg -y -hide_banner -loglevel error -i ${input}\
                -threads ${options.threads}\
                -vf scale=-2:${res}\
                -c:v libx264\
                -crf ${options.crf}\
                -preset ${options.preset}\
                -movflags +faststart\
                -qp 0\
                -g 48 -sc_threshold 0 -keyint_min 48\
                -b:v ${videoMaxBitrate} -maxrate ${videoMaxBitrate} -bufsize ${videoBufferSize}\
                -c:a aac -b:a ${audioBitrate} -ar ${options.audioFrequency}\
                -f hls\
                -hls_time ${options.segmentTime}\
                -hls_playlist_type vod \
                -hls_flags independent_segments \
                -hls_segment_type mpegts \
                -hls_segment_filename ${videoFolder}/segment%02d.ts\
                ${videoFolder}/${file.replace(/\.[^/.]+$/, "")}.m3u8`)
                    .then(() => {
                        console.log(`${res}p video segments created`)
                        fs.readdir(videoFolder, (err, files) => {
                            bandwidths[res] = 0
                            files.forEach((file) => {
                                const fileSize = fs.statSync(videoFolder + '/' + file).size
                                if (fileSize > bandwidths[res]) bandwidths[res] = fileSize
                            })
                            if (i === options.videoRes.length - 1) resolve()
                            i++
                        })
                    })
            })
        }).then(() => {
            console.log(`Creating master playlist`)
            const masterPlaylist = outputFolder + '/master.m3u8'
            let content = '#EXTM3U\n#EXT-X-VERSION:3\n'

            new Promise((resolve, reject) => {
                let i = 0
                options.videoRes.forEach(async (res) => {
                    const bandwidth = bandwidths[res]
                    const videoFolder = res + 'p'
                    const rawResolution = await quiet($`ffprobe -hide_banner -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 ${outputFolder.slice(2)}/${videoFolder}/${file.replace(/\.[^/.]+$/, "")}.m3u8`)

                    const resolution = rawResolution.stdout.split('\n')[0]
                    content += `\n#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${resolution}\n${videoFolder}/${file.replace(/\.[^/.]+$/, "")}.m3u8\n`
                    if (i === options.videoRes.length - 1) resolve()
                    i++
                })
            }).then(() => {
                fs.writeFileSync(masterPlaylist, content)
                console.log(`Master playlist created`)
                stop()
                console.log(`\n\nConverting finished`)
            })
        })
    })
})