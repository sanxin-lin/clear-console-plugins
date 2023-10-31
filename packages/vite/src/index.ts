import generate from '@babel/generator'
import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import type { StringLiteral } from '@babel/types'
import type { RawSourceMap } from 'source-map'
import { SourceMapConsumer } from 'source-map'
import type { Plugin } from 'vite'
import { createFilter } from 'vite'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const _traverse = (
  typeof traverse === 'function' ? traverse : (traverse as any).default
) as typeof traverse

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const _generate = (
  typeof generate === 'function' ? generate : (generate as any).default
) as typeof generate

function stringLiteral(value: string) {
  const stringLiteralNode: StringLiteral = {
    type: 'StringLiteral',
    value,
  }
  return stringLiteralNode
}

function generateStrNode(str: string): StringLiteral & { skip: boolean } {
  const node = stringLiteral(str)

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  node.skip = true
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return node
}

// 分隔字符串节点
const splitCode = generateStrNode('\n')

// 提示文件路径+行数的文本
function handleFileNameTip(filePath: string, lineNumber: number) {
  if (!filePath) return ''
  return ` -> ${filePath}:${lineNumber}`
}

export interface IVitePerfectConsolePluginOptions {
  tip?: string
}

const VitePerfectConsolePlugin = (
  { tip }: IVitePerfectConsolePluginOptions = {
    tip: '🐷🐷🐷🐷🐷🐷',
  },
): Plugin => {
  let root = ''
  // 检测的文件类型范围
  const filter = createFilter(
    [/\.[jt]sx?$/, /\.vue$/, /\.svelte$/, /\.astro$/],
    [/[\\/]node_modules[\\/]/, /[\\/]\.git[\\/]/],
  )

  // 提示行数的文本
  function generateLineOfTip(relativeFilename: string, lineNumber: number) {
    return `${relativeFilename ? '' : `line of ${lineNumber} `}${tip}`
  }

  return {
    name: 'vite-perfect-console-plugin',
    // 这个钩子在vite解析完配置后调用
    configResolved(config) {
      // 获取最终的root路径
      root = config.root
    },
    // 代码解析后此插件再执行
    enforce: 'post',
    // 解析每一个模块
    async transform(code, id) {
      // 不属于范围内的文件，不处理
      if (!filter(id)) return
      const rawSourcemap = this.getCombinedSourcemap()
      // 解析指定路径的代码为ast，id就是路径
      const ast = parse(code, {
        sourceType: 'unambiguous',
        sourceFilename: id,
      })
      const consumer = await new SourceMapConsumer(rawSourcemap as RawSourceMap)

      // 调用traverse对ast进行遍历
      _traverse(ast, {
        CallExpression(path) {
          // 获取每个节点的代码
          const calleeCode = _generate(path.node.callee).code
          // 只处理代码是console.log的代码
          if (calleeCode === 'console.log') {
            // 获取console.log函数的入参数组
            const nodeArguments = path.node.arguments
            // 遍历入参数组
            for (let i = 0; i < nodeArguments.length; i++) {
              const argument = nodeArguments[i]
              // 处理过的直接跳过
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              if (argument.skip) continue
              if (!argument.type.endsWith('Literal')) {
                // 如果是变量的节点，则走这个逻辑

                if (
                  argument.type === 'Identifier' &&
                  argument.name === 'undefined'
                ) {
                  // 变量名不合法，直接塞分隔节点，然后跳过
                  nodeArguments.splice(i + 1, 0, splitCode)
                  continue
                }
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                argument.skip = true
                // 如果变量名合法，则获取变量名，并拼上 =
                const node = generateStrNode(`${_generate(argument).code} =`)
                // 塞到变量节点的前面
                nodeArguments.splice(i, 0, node)
                // 在变量节点后面塞入一个分隔符
                nodeArguments.splice(i + 2, 0, splitCode)
              } else {
                // 如果是值，则走这个逻辑

                // 直接塞一个分号在后面
                // 这个分号必须是一个ast字符串节点
                nodeArguments.splice(i + 1, 0, splitCode)
              }
            }
            if (nodeArguments[nodeArguments.length - 1] === splitCode) {
              // 去掉最后一个分隔符，不需要显示出来
              nodeArguments.pop()
            }

            // 开始获取console.log的代码位置
            const { loc } = path.node
            if (loc) {
              // 计算console.log在原始代码中的位置
              let startLine: any = null
              let endLine: any = null
              const { line: _startLine, column: _startColumn } = loc.start
              const { line: _endtLine, column: _endColumn } = loc.end
              // 使用 originalPositionFor 方法计算原始起始行
              const { line: originStartLine } = consumer.originalPositionFor({
                line: _startLine,
                column: _startColumn,
              })
              // 使用 originalPositionFor 方法计算原始终止行
              const { line: originEndLine } = consumer.originalPositionFor({
                line: _endtLine,
                column: _endColumn,
              })

              startLine = originStartLine
              endLine = originEndLine

              // 构造出提示文件名+起始行数的字符串节点
              const relativeFilename = id.replace(`${root}/`, '').split('?')[0]
              const startLineTipNode = stringLiteral(
                `${generateLineOfTip(
                  relativeFilename,
                  startLine!,
                )}${handleFileNameTip(relativeFilename, startLine!)}\n`,
              )
              // 放到console.log参数的最前面，让他输出在顶端
              nodeArguments.unshift(startLineTipNode)
              // 如果起始 === 终止，那就没必要显示终止行数
              if (startLine === endLine) return
              // 构造出提示文件名+终止行数的字符串节点
              const endLineTipNode = stringLiteral(
                `\n${generateLineOfTip(
                  relativeFilename,
                  endLine!,
                )}${handleFileNameTip(relativeFilename, endLine!)}\n`,
              )
              // 塞到console.log参数的末尾
              nodeArguments.push(endLineTipNode)
            }
          }
        },
      })

      // 使用_generate转换ast
      const { code: newCode, map } = _generate(ast, {
        sourceFileName: id,
        // 保留空行
        retainLines: true,
        // 生成sourcemap文件
        sourceMaps: true,
      })

      return {
        code: newCode,
        map,
      }
    },
  }
}

export default VitePerfectConsolePlugin
