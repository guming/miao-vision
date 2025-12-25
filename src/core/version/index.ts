/**
 * Version Control Module
 *
 * Exports for report version management
 *
 * @module core/version
 */

export { getVersionStorage, initVersionStorage, VersionStorage } from './version-storage'
export {
  diffText,
  diffTextWithLineNumbers,
  diffToHTML,
  compareVersions,
  compareMarkdownStructure,
  getDiffSummary
} from './diff-service'
