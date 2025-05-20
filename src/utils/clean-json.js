#!/usr/bin/env node

/**
 * JSON文件清理工具 - 移除文件中的\r字符
 * 用法: node clean-json.js <文件路径>
 */

const fs = require('fs')
const path = require('path')

// 获取命令行参数
const filePath = process.argv[2]

if (!filePath) {
    console.error('错误: 请提供JSON文件路径')
    console.error('用法: node clean-json.js <文件路径>')
    process.exit(1)
}

// 读取文件
console.log(`正在处理: ${filePath}`)
fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
        console.error(`读取文件失败: ${err.message}`)
        process.exit(1)
    }

    try {
        // 解析JSON
        const jsonData = JSON.parse(data)

        // 遍历并清理\r字符
        function cleanObject(obj) {
            if (Array.isArray(obj)) {
                // 如果是数组，递归处理每个元素
                return obj.map(item => cleanObject(item))
            } else if (obj !== null && typeof obj === 'object') {
                // 如果是对象，清理每个键和值
                const cleanedObj = {}

                Object.keys(obj).forEach(key => {
                    // 清理键中的\r
                    const cleanKey = key.replace(/\r/g, '')

                    // 递归清理值
                    const cleanValue = cleanObject(obj[key])

                    cleanedObj[cleanKey] = cleanValue
                })

                return cleanedObj
            } else if (typeof obj === 'string') {
                // 如果是字符串，清理\r
                return obj.replace(/\r/g, '')
            } else {
                // 其他类型直接返回
                return obj
            }
        }

        // 清理整个JSON对象
        const cleanedJson = cleanObject(jsonData)

        // 计算原始大小和清理后的大小
        const originalSize = data.length
        const cleanedString = JSON.stringify(cleanedJson, null, 2)
        const cleanedSize = cleanedString.length

        // 备份原文件
        const backupPath = `${filePath}.bak`
        fs.writeFile(backupPath, data, 'utf8', backupErr => {
            if (backupErr) {
                console.error(`创建备份文件失败: ${backupErr.message}`)
            } else {
                console.log(`已创建备份: ${backupPath}`)
            }

            // 写入清理后的文件
            fs.writeFile(filePath, cleanedString, 'utf8', writeErr => {
                if (writeErr) {
                    console.error(`写入文件失败: ${writeErr.message}`)
                    process.exit(1)
                }

                console.log('清理完成!')
                console.log(`移除了 ${originalSize - cleanedSize} 个字节的\\r字符`)
            })
        })
    } catch (jsonErr) {
        console.error(`解析JSON失败: ${jsonErr.message}`)
        process.exit(1)
    }
})
