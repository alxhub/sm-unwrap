import {SourceMapConsumer, MappingItem} from 'source-map';
import {Strategy, SourceDirMap, DirContentsMap} from '../interface';

export class SpanStrategy implements Strategy {
  process(contents: string, map: SourceMapConsumer, sourceDirMap: SourceDirMap, unmappedSource: string): DirContentsMap {
    console.log(`running on ${unmappedSource}`)
    let lines = contents.split('\n');
    let lastMapping: MappingItem|null = null;

    let outMap: DirContentsMap = {};

    function getPiece(startLine: number, startCol: number, endLine: number, endCol: number): string {
      let piece: string = '';

      for (let i = startLine; i <= endLine; i++) {
        const line = lines[i - 1];
        if (i === startLine) {
          if (i === endLine) {
            piece += line.substring(startCol, endCol);
          } else {
            piece += line.substring(startCol);
          }
        } else if (i === endLine) {
          piece += line.substring(0, endCol);
        } else {
          piece += line;
        }
      }

      return piece;
    }

    function account(source: string, piece: string): void {
      console.log(`logging ${piece.length} bytes to ${source}`);
      const dir = sourceDirMap[source];
      if (!outMap[dir]) {
        outMap[dir] = '';
      }
      outMap[dir] += piece;
    }

    let lastSource: string = unmappedSource;
    let bytesOfLastSource: number = 0;

    function processMapping(mapping: MappingItem, endLine: number, endCol: number) {
      const piece = getPiece(lastMapping.generatedLine, lastMapping.generatedColumn, endLine, endCol);
      if (bytesOfLastSource > 0 && lastMapping.source !== lastSource) {
        account(unmappedSource, `\n\n/* ${bytesOfLastSource} bytes in ${lastSource} */\n\n`);
        bytesOfLastSource = 0;
      }
      account(lastMapping.source, piece);
      if (lastMapping.source !== unmappedSource) {
        bytesOfLastSource += piece.length;
        lastSource = lastMapping.source;
      }
    }

    map.eachMapping(mapping => {
      if (lastMapping === null && (mapping.generatedLine > 1 || mapping.generatedColumn > 0)) {
        const piece = getPiece(1, 0, mapping.generatedLine, mapping.generatedColumn);
        account(unmappedSource, piece);
      } else if (lastMapping !== null) {
        processMapping(lastMapping, mapping.generatedLine, mapping.generatedColumn);
      }
      lastMapping = mapping;
    });
    processMapping(lastMapping, lines.length, lines[lines.length - 1].length - 1);
    if (bytesOfLastSource > 0) {
      account(unmappedSource, `\n\n/* ${bytesOfLastSource} bytes in ${lastSource} */\n\n`);
    }

    return outMap;
  }
}
