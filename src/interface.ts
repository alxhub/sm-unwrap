import {SourceMapConsumer} from 'source-map';

export interface SourceDirMap {
  [source: string]: string;
}

export interface DirContentsMap {
  [dir: string]: string;
}

export interface Strategy {
  process(contents: string, map: SourceMapConsumer, sourceToDir: SourceDirMap, unmappedSource: string): DirContentsMap
}
