// 筛选每天早上7点到9点之间最轻的身体数据记录
const fs = require('fs')
const path = require('path')

// 输入和输出文件路径
const inputFile = path.join(__dirname, '..', 'data', 'BODY_DATA.json')
const outputFile = path.join(__dirname, '..', 'data', 'BODY_MORNING_DATA.json')

console.log('开始处理数据...')
console.log(`输入文件: ${inputFile}`)
console.log(`输出文件: ${outputFile}`)

// 读取原始JSON数据
fs.readFile(inputFile, 'utf8', (err, data) => {
    if (err) {
        console.error('读取文件时出错:', err)
        return
    }

    try {
        // 解析JSON数据
        const bodyData = JSON.parse(data)

        // 按日期分组数据
        const dailyData = {}

        bodyData.forEach(entry => {
            // 解析时间字符串
            const timeStr = entry.time
            const datePart = timeStr.split(' ')[0] // 获取日期部分 (YYYY-MM-DD)
            const timePart = timeStr.split(' ')[1] // 获取时间部分 (HH:MM:SS)

            // 分解时间，用于筛选早上7点到9点的记录
            const hour = parseInt(timePart.split(':')[0], 10)

            // 只处理早上7点到9点(7:00:00-8:59:59)的记录
            if (hour >= 7 && hour < 9) {
                if (!dailyData[datePart]) {
                    dailyData[datePart] = []
                }
                dailyData[datePart].push(entry)
            }
        })

        // 从每天的早晨记录中筛选出体重最轻的记录
        const filteredData = []

        for (const date in dailyData) {
            if (dailyData[date].length > 0) {
                // 按体重排序（升序）
                const sortedEntries = dailyData[date].sort((a, b) => a.weight - b.weight)
                // 选择最轻的记录
                const cleanEntry = sortedEntries[0]

                // 清理可能包含\r的键和值
                const cleanedEntry = {}
                Object.keys(cleanEntry).forEach(key => {
                    // 移除键中的\r字符
                    const cleanKey = key.replace(/\r/g, '')

                    // 如果值是字符串，也移除其中的\r字符
                    let value = cleanEntry[key]
                    if (typeof value === 'string') {
                        value = value.replace(/\r/g, '')
                    }

                    cleanedEntry[cleanKey] = value
                })

                filteredData.push(cleanedEntry)
            }
        }

        // 按时间排序
        filteredData.sort((a, b) => new Date(a.time) - new Date(b.time))

        // 写入筛选后的数据到新文件
        fs.writeFile(outputFile, JSON.stringify(filteredData, null, 2), 'utf8', err => {
            if (err) {
                console.error('写入文件时出错:', err)
                return
            }
            console.log('数据筛选完成！')
            console.log(`结果已保存到: ${outputFile}`)
            console.log(`从原始数据中筛选出 ${filteredData.length} 条早晨最轻记录`)
        })
    } catch (parseErr) {
        console.error('解析JSON数据时出错:', parseErr)
    }
})
