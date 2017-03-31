import * as fs from 'fs';
import * as path from 'path';

import {SourceMapConsumer} from 'source-map';

import {SourceDirMap} from './interface';
import {ExplorerStrategy} from './strategy/explorer';
import {SpanStrategy} from './strategy/span';

const contents = fs.readFileSync(process.argv[2]).toString();
const map = new SourceMapConsumer(fs.readFileSync(`${process.argv[2]}.map`).toString());

function getSources(map: SourceMapConsumer): string[] {
  const keys = {};
  map.eachMapping(mapping => keys[mapping.source] = true);
  return Object.keys(keys).sort();
}

function determineUnmappedSource(sources: string[], entry: string): string {
  const matching = sources.filter(source => source.indexOf(entry) !== -1);
  if (matching.length > 0) {
    return matching[0];
  }
  return entry;
}

function makeDirMap(sources: string[], unmapped: string): SourceDirMap {
  let map = {};
  sources.forEach(source => map[source] = source);
  if (!map[unmapped]) {
    map[unmapped] = unmapped;
  }
  return map;
}

const sources = getSources(map);
sources.forEach(source => console.log(source));
const unmappedSource = determineUnmappedSource(sources, path.basename(process.argv[2]));

const strategy = new ExplorerStrategy();

const res = strategy.process(contents, map, makeDirMap(sources, unmappedSource), unmappedSource);

console.log(`unmapped source is ${unmappedSource}`)
console.log(res[unmappedSource]);
