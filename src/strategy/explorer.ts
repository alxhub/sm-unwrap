import {SourceMapConsumer, MappingItem} from 'source-map';
import {Strategy, SourceDirMap, DirContentsMap} from '../interface';

function compareMins(a, b) {
  if (a.min < b.min) {
    return -1;
  } else if (a.min === b.min) {
    return 0;
  }
  return 1;
}

interface RangeMap {
  [source: string]: {min: number, max?: number};
}

export class ExplorerStrategy implements Strategy {

  getRangeMap(map: SourceMapConsumer, lines: string[]): RangeMap {
    let sourceExtrema: RangeMap = {};  // source -> {min: num, max: num}
    let pos = 0;
    let lastSource: string|null = null;
    for (let line = 1; line <= lines.length; line++) {
      const lineLength = lines[line - 1].length;
      for (let column = 0; column < lineLength; column++) {
        const mapped = map.originalPositionFor({line, column});
        if (mapped.source === null) {
          // Do nothing.
        } else if (mapped.source !== lastSource) {
          if (!(mapped.source in sourceExtrema)) {
            sourceExtrema[mapped.source] = {min: pos};
            lastSource = mapped.source;
          }
        } else {
          sourceExtrema[mapped.source].max = pos;
        }
        pos++;
      }
    }
    return sourceExtrema;
  }

  process(contents: string, map: SourceMapConsumer, sourceDirMap: SourceDirMap, unmappedSource: string): DirContentsMap {
    const lines = contents.split('\n');
    const extrema = this.getRangeMap(map, lines);
    const ranges = Object
      .keys(extrema)
      .filter(key => key !== unmappedSource)
      .map(key => {
        const range = extrema[key];
        return {
          source: key,
          min: range.min,
          max: range.max,
        };
      })
      .sort(compareMins);

    let start = 0;
    let outMap = {};
    const unmappedDir = sourceDirMap[unmappedSource];
    outMap[unmappedDir] = '';

    ranges.forEach(range => {
      const dir = sourceDirMap[range.source];
      if (start < range.min) {
        outMap[unmappedDir] += contents.substring(start, range.min);
      }
      outMap[dir] = contents.substring(range.min, range.max + 1);
      outMap[unmappedDir] += `\n\n/* ${range.max + 1 - range.min} bytes in ${range.source} */\n\n`;

      start = range.max + 1;
    });
    outMap[unmappedDir] += contents.substring(start);

    return outMap;
  }
}