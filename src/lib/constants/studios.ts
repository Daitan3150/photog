export interface StudioInfo {
    name: string;
    addressZip?: string;
    addressPref?: string;
    addressCity?: string;
    address?: string;
    url?: string;
}

export const STUDIOS: StudioInfo[] = [
    {
        name: 'スタジオ シェア',
        addressZip: '130-0023',
        addressPref: '東京都',
        addressCity: '墨田区立川4-11-20 プロスパリティ1 101',
        url: 'https://www.studio-share.com/'
    },
    {
        name: 'ハコスタジアム東京',
        addressZip: '273-0012',
        addressPref: '千葉県',
        addressCity: '船橋市浜町2-1-1 ららぽーとTOKYO-BAY 北館3F',
        url: 'https://hacostadium.com/tokyo/'
    },
    {
        name: 'スタジオ パルフェ',
        addressZip: '171-0014',
        addressPref: '東京都',
        addressCity: '豊島区池袋2丁目64-11',
        url: 'https://studio-parfait.jp/'
    },
    {
        name: 'アキバホーム',
        addressZip: '101-0021',
        addressPref: '東京都',
        addressCity: '千代田区外神田3-7-12',
        url: 'https://akibahome.com/'
    }
];
