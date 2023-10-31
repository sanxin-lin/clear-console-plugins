import generate from '@babel/generator'
import { declare } from '@babel/helper-plugin-utils'
import type { StringLiteral } from '@babel/types'
import { stringLiteral } from '@babel/types'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const _generate = (
  typeof generate === 'function' ? generate : (generate as any).default
) as typeof generate

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

const SKIP_KEY = '@@babel-perfect-console-plugin'

// 提示文件路径+行数的文本
function handleFileNameTip(filePath: string, lineNumber: number) {
  if (!filePath) return ''
  return ` -> ${filePath}:${lineNumber}`
}

export interface IBabelPerfectConsolePluginOptions {
  tip?: string
  root?: string
}

const BabelPerfectConsolePlugin = declare<IBabelPerfectConsolePluginOptions>(
  (babel, { tip = '🐷🐷🐷🐷🐷🐷', root = process.cwd() }) => {
    const { types: t } = babel
    const rootReg = new RegExp(`${root}\\/?`)
    // 提示行数的文本
    function generateLineOfTip(relativeFilename: string, lineNumber: number) {
      return `${relativeFilename ? '' : `line of ${lineNumber} `}${tip}`
    }

    return {
      name: 'perfect-console',
      visitor: {
        CallExpression(path, { filename }) {
          // 获取每个节点的代码
          const calleeCode = _generate(path.node.callee).code
          // 只处理代码是console.log的代码
          if (calleeCode === 'console.log') {
            // 通过注释节点来标记跳过
            const { trailingComments } = path.node
            const shouldSkip = (trailingComments || []).some((item) => {
              return item.type === 'CommentBlock' && item.value === SKIP_KEY
            })
            if (shouldSkip) return

            t.addComment(path.node, 'trailing', SKIP_KEY)

            // 获取console.log函数的入参数组
            const nodeArguments = path.node.arguments
            // 遍历入参数组
            for (let i = 0; i < nodeArguments.length; i++) {
              const argument = nodeArguments[i]
              // 处理过的直接跳过
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              if (argument.skip) continue
              if (!t.isLiteral(argument)) {
                // 如果是变量的节点，则走这个逻辑

                if (t.isIdentifier(argument) && argument.name === 'undefined') {
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
              const startLine = loc.start.line
              const endLine = loc.end.line
              let relativeFilename = ''
              if (filename) {
                // 构造出提示文件名+起始行数的字符串节点
                relativeFilename = filename.replace(rootReg, '')
              }
              const startLineTipNode = t.stringLiteral(
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
              const endLineTipNode = t.stringLiteral(
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
      },
    }
  },
)

export default BabelPerfectConsolePlugin
