#!/usr/bin/env node

/**
 * 体重数据处理与可视化脚本
 *
 * 此脚本完成以下任务：
 * 1. 将CSV数据转换为JSON
 * 2. 过滤出每天早晨最轻的体重数据
 * 3. 启动HTTP服务器
 * 4. 打开浏览器显示体重趋势可视化页面
 */

const fs = require('fs')
const path = require('path')
const { exec, spawn } = require('child_process')
const readline = require('readline')

// 定义文件路径
const CSV_FILE = path.join(__dirname, 'src/data/BODY_1747705571882.csv')
const JSON_FILE = path.join(__dirname, 'src/data/BODY_DATA.json')
const MORNING_DATA_FILE = path.join(__dirname, 'src/data/BODY_MORNING_DATA.json')
const HTML_FILE = path.join(__dirname, 'src/web/weight-trend.html')

// 创建日志前缀函数
const log = prefix => message => console.log(`[${prefix}] ${message}`)
const info = log('信息')
const error = log('错误')
const success = log('成功')

// 确保CSV文件存在
function checkCsvFile() {
    return new Promise((resolve, reject) => {
        info('检查CSV文件是否存在...')

        fs.access(CSV_FILE, fs.constants.F_OK, err => {
            if (err) {
                error(`CSV文件不存在: ${CSV_FILE}`)

                // 提示用户输入CSV文件路径
                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout,
                })

                rl.question('请输入CSV文件的路径: ', csvPath => {
                    rl.close()

                    // 尝试读取用户提供的路径
                    fs.access(csvPath, fs.constants.F_OK, csvErr => {
                        if (csvErr) {
                            reject(new Error(`无法访问文件: ${csvPath}`))
                        } else {
                            // 创建符号链接或复制文件
                            fs.copyFile(csvPath, CSV_FILE, copyErr => {
                                if (copyErr) {
                                    reject(new Error(`无法复制文件: ${copyErr.message}`))
                                } else {
                                    success(`已将CSV文件复制到: ${CSV_FILE}`)
                                    resolve()
                                }
                            })
                        }
                    })
                })
            } else {
                success('CSV文件已存在')
                resolve()
            }
        })
    })
}

// 步骤1: 将CSV转换为JSON
function convertCsvToJson() {
    return new Promise((resolve, reject) => {
        info('步骤1: 将CSV转换为JSON...')

        const processFile = path.join(__dirname, 'src/scripts/processWeightToJson.js')

        // 检查处理脚本是否存在
        fs.access(processFile, fs.constants.F_OK, err => {
            if (err) {
                reject(new Error(`转换脚本不存在: ${processFile}`))
                return
            }

            // 执行转换脚本
            const process = exec(`node "${processFile}"`, (err, stdout, stderr) => {
                if (err) {
                    error(`CSV转JSON失败: ${err.message}`)
                    error(stderr)
                    reject(err)
                    return
                }

                success('CSV转JSON成功')
                console.log(stdout)

                // 检查输出文件是否创建成功
                fs.access(JSON_FILE, fs.constants.F_OK, accessErr => {
                    if (accessErr) {
                        reject(new Error(`JSON文件未生成: ${JSON_FILE}`))
                    } else {
                        resolve()
                    }
                })
            })
        })
    })
}

// 步骤2: 过滤早晨数据
function filterMorningData() {
    return new Promise((resolve, reject) => {
        info('步骤2: 过滤早晨体重数据...')

        const filterFile = path.join(__dirname, 'src/scripts/filterMorningWeight.js')

        // 检查过滤脚本是否存在
        fs.access(filterFile, fs.constants.F_OK, err => {
            if (err) {
                reject(new Error(`过滤脚本不存在: ${filterFile}`))
                return
            }

            // 执行过滤脚本
            exec(`node "${filterFile}"`, (err, stdout, stderr) => {
                if (err) {
                    error(`过滤早晨数据失败: ${err.message}`)
                    error(stderr)
                    reject(err)
                    return
                }

                success('早晨数据过滤成功')
                console.log(stdout)

                // 检查输出文件是否创建成功
                fs.access(MORNING_DATA_FILE, fs.constants.F_OK, accessErr => {
                    if (accessErr) {
                        reject(new Error(`过滤后的数据文件未生成: ${MORNING_DATA_FILE}`))
                    } else {
                        // 确保JSON文件中没有\r字符
                        info('检查并清理JSON文件中可能的\\r字符...')

                        // 读取JSON文件
                        fs.readFile(MORNING_DATA_FILE, 'utf8', (readErr, data) => {
                            if (readErr) {
                                error(`读取过滤数据失败: ${readErr.message}`)
                                resolve() // 继续执行，但记录错误
                                return
                            }

                            // 检查是否包含\r字符
                            if (data.includes('\r')) {
                                info('发现\\r字符，开始清理...')

                                try {
                                    // 解析JSON
                                    const jsonData = JSON.parse(data)

                                    // 清理\r字符的函数
                                    function cleanObject(obj) {
                                        if (Array.isArray(obj)) {
                                            return obj.map(item => cleanObject(item))
                                        } else if (obj !== null && typeof obj === 'object') {
                                            const cleanedObj = {}
                                            Object.keys(obj).forEach(key => {
                                                const cleanKey = key.replace(/\r/g, '')
                                                cleanedObj[cleanKey] = cleanObject(obj[key])
                                            })
                                            return cleanedObj
                                        } else if (typeof obj === 'string') {
                                            return obj.replace(/\r/g, '')
                                        } else {
                                            return obj
                                        }
                                    }

                                    // 清理数据
                                    const cleanedJson = cleanObject(jsonData)

                                    // 写入清理后的数据
                                    fs.writeFile(
                                        MORNING_DATA_FILE,
                                        JSON.stringify(cleanedJson, null, 2),
                                        'utf8',
                                        writeErr => {
                                            if (writeErr) {
                                                error(`清理JSON文件时出错: ${writeErr.message}`)
                                            } else {
                                                success('成功清理JSON文件中的\\r字符')
                                            }
                                            resolve()
                                        }
                                    )
                                } catch (parseErr) {
                                    error(`解析JSON文件失败: ${parseErr.message}`)
                                    resolve() // 继续执行，但记录错误
                                }
                            } else {
                                // 没有\r字符，继续执行
                                info('文件格式正确，无需清理')
                                resolve()
                            }
                        })
                    }
                })
            })
        })
    })
}

// 步骤3: 启动HTTP服务器
function startHttpServer() {
    return new Promise(resolve => {
        info('步骤3: 启动HTTP服务器...')

        // 检查HTML文件是否存在
        fs.access(HTML_FILE, fs.constants.F_OK, err => {
            if (err) {
                error(`HTML文件不存在: ${HTML_FILE}`)
                resolve(null) // 继续执行但返回null表示未启动服务器
                return
            }

            // 寻找可用端口
            const port = 8080

            // 使用spawn而不是exec，保持服务器运行
            const server = spawn('python', ['-m', 'http.server', port.toString()], {
                cwd: __dirname,
                stdio: ['ignore', 'pipe', 'pipe'],
            })

            // 监听输出
            server.stdout.on('data', data => {
                console.log(data.toString().trim())
            })

            server.stderr.on('data', data => {
                error(data.toString().trim())
            })

            // 监听错误和关闭事件
            server.on('error', err => {
                error(`服务器启动失败: ${err.message}`)
                resolve(null)
            })

            // 给服务器一点时间启动
            setTimeout(() => {
                success(`HTTP服务器已启动，端口: ${port}`)
                resolve(port)
            }, 1000)
        })
    })
}

// 步骤4: 打开浏览器
function openBrowser(port) {
    return new Promise(resolve => {
        if (!port) {
            error('由于服务器未能启动，无法打开浏览器')
            resolve()
            return
        }

        info('步骤4: 打开浏览器访问可视化页面...')

        const url = `http://localhost:${port}/src/web/weight-trend.html`
        let command

        // 根据操作系统选择打开浏览器的命令
        switch (process.platform) {
            case 'darwin': // macOS
                command = `open "${url}"`
                break
            case 'win32': // Windows
                command = `start "" "${url}"`
                break
            default: // Linux 和其他
                command = `xdg-open "${url}" || sensible-browser "${url}" || x-www-browser "${url}" || gnome-open "${url}"`
        }

        // 执行打开浏览器的命令
        exec(command, err => {
            if (err) {
                error(`无法自动打开浏览器: ${err.message}`)
                info(`请手动在浏览器中访问: ${url}`)
            } else {
                success(`已在浏览器中打开: ${url}`)
            }
            resolve()
        })
    })
}

// 主函数
async function main() {
    console.log('\n==== 体重数据处理与可视化流程 ====\n')
    try {
        // 步骤0: 确保CSV文件存在
        await checkCsvFile()

        // 步骤1: CSV转JSON
        await convertCsvToJson()

        // 步骤2: 过滤早晨数据
        await filterMorningData()

        // 步骤3: 启动HTTP服务器
        const port = await startHttpServer()

        // 步骤4: 打开浏览器
        await openBrowser(port)

        console.log('\n==== 处理完成 ====')
        console.log('按Ctrl+C退出程序并关闭服务器')
    } catch (err) {
        error(`处理过程中发生错误: ${err.message}`)
        process.exit(1)
    }
}

// 执行主函数
main()
