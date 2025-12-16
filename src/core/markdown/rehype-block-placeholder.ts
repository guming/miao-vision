/**
 * Rehype plugin to replace SQL and Chart code blocks with placeholders
 *
 * This allows us to inject Svelte components at the exact position
 * where the code block appears in the Markdown
 */

import { visit } from 'unist-util-visit'
import type { Root, Element } from 'hast'
import { shouldCreatePlaceholder } from '@core/registry'

interface BlockPlaceholderOptions {
  blockIds: Map<string, { id: string; language: string }>
}

/**
 * Rehype plugin that replaces code blocks with placeholder divs
 */
export function rehypeBlockPlaceholder(options: BlockPlaceholderOptions) {
  console.log('🎯 rehypeBlockPlaceholder: Plugin function called (plugin is being initialized)')

  let codeBlockCounter = 0

  return function transformer(tree: Root) {
    console.log('🔧 rehype-block-placeholder: Transformer function called (processing tree)')
    console.log('Tree type:', tree.type)
    console.log('Tree children count:', tree.children?.length)

    // Debug: log tree structure
    if (tree.children && tree.children.length > 0) {
      console.log('First few children types:', tree.children.slice(0, 5).map(c => c.type))
    }

    let foundCodeBlocks = 0
    let replacedBlocks = 0
    let foundPreElements = 0

    visit(tree, 'element', (node: Element, index, parent) => {
      // Debug all elements
      if (node.tagName === 'pre') {
        foundPreElements++
        console.log(`  Found <pre> element ${foundPreElements}:`, {
          tagName: node.tagName,
          childrenCount: node.children.length,
          firstChild: node.children[0]?.type
        })
      }

      // Find <pre><code> structures
      if (node.tagName === 'pre' && node.children.length > 0) {
        const codeNode = node.children[0]
        console.log(`  Checking <pre> child:`, {
          type: codeNode.type,
          tagName: (codeNode as any).tagName
        })

        if (codeNode.type === 'element' && codeNode.tagName === 'code') {
          foundCodeBlocks++

          // Get language from className
          const className = codeNode.properties?.className as string[] | undefined
          let language = 'text'

          if (className && Array.isArray(className)) {
            const langClass = className.find((c: string) => c.startsWith('language-'))
            if (langClass) {
              language = langClass.replace('language-', '')
            }
          }

          const blockId = `block_${codeBlockCounter++}`

          console.log(`  Found code block ${blockId}: language=${language}, classes=${JSON.stringify(className)}`)

          // Store block info for later reference
          options.blockIds.set(blockId, { id: blockId, language })

          // Replace blocks with placeholders using registry
          if (shouldCreatePlaceholder(language)) {
            console.log(`  → Replacing ${language} block ${blockId} with placeholder`)

            const placeholder: Element = {
              type: 'element',
              tagName: 'div',
              properties: {
                className: ['block-placeholder', `block-placeholder-${language}`],
                'data-block-id': blockId,
                'data-block-type': language
              },
              children: []
            }

            // Replace the <pre> node with placeholder
            if (parent && typeof index === 'number') {
              console.log(`  Replacing at parent index ${index}`)
              parent.children[index] = placeholder
              replacedBlocks++
              console.log(`  ✅ Replaced block ${blockId}`)
            } else {
              console.error(`  ❌ Could not replace block ${blockId}:`, {
                hasParent: !!parent,
                index: index,
                indexType: typeof index
              })
            }
          } else {
            console.log(`  → Keeping ${language} block ${blockId} (not a special block type)`)
          }
        }
      }
    })

    console.log(`🔧 rehype-block-placeholder: Summary:`)
    console.log(`  Found <pre> elements: ${foundPreElements}`)
    console.log(`  Found code blocks: ${foundCodeBlocks}`)
    console.log(`  Replaced with placeholders: ${replacedBlocks}`)
    console.log(`  blockIds Map size: ${options.blockIds.size}`)
    console.log(`  blockIds entries:`, Array.from(options.blockIds.entries()))

    // Return the modified tree (although in-place modification should work)
    return tree
  }
}
