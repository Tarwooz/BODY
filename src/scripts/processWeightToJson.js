const fs = require('fs')
const path = require('path')

// 输入和输出文件路径
const inputFile = path.join(__dirname, '..', 'data', 'BODY_1747705571882.csv')
const outputFile = path.join(__dirname, '..', 'data', 'BODY_DATA.json')

// 读取CSV文件
fs.readFile(inputFile, 'utf8', (err, data) => {
    if (err) {
        console.error('读取文件时出错:', err)
        return
    }

    // 将CSV数据转换为JSON
    const lines = data.trim().split('\n')
    const headers = lines[0].split(',')

    const jsonData = lines.slice(1).map(line => {
        const values = line.split(',')
        const entry = {}

        headers.forEach((header, index) => {
            if (header === 'time') {
                // 解析时间，转换为东八区
                const utcTime = new Date(values[index])

                // 方法1：计算东八区时间（UTC+8）
                const localTime = new Date(utcTime.getTime())

                // 格式化为友好的日期时间格式
                entry[header] = localTime
                    .toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                    })
                    .replace(/\//g, '-')
            } else if (header === 'weight' || header === 'height' || header === 'bmi') {
                // 将数值字段转换为数字类型
                entry[header] = parseFloat(values[index])
            } else {
                entry[header] = values[index]
            }
        })

        return entry
    })

    // 写入JSON文件
    fs.writeFile(outputFile, JSON.stringify(jsonData, null, 2), 'utf8', err => {
        if (err) {
            console.error('写入文件时出错:', err)
            return
        }
        console.log('数据处理完成！')
        console.log(`结果已保存到: ${outputFile}`)
        console.log(`共处理了 ${jsonData.length} 条记录`)
    })
})
