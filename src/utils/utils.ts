export const uniqueNumberId = () => {
  const timestamp = Date.now(); // milliseconds since epoch
  const random = Math.floor(Math.random() * 1000); // 0–999
  return timestamp * 1000 + random; // e.g. 1735075445123123
}


export const randomValueByMaxValue = (maxValue: number) => Math.floor(Math.random() * maxValue) + 1;

export type WordMap<KeyType extends string | number = string> = {
  [key in KeyType]: string;
};


export const lastItemInArray = <T>(arr: T[]): T | null => arr.length ? arr[arr.length - 1] : null

export default undefined
