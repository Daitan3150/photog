async function test() {
    const domain = "daitan3150no1-blog";
    const apiKey = "WPmBoMwJKf1Tc5Rvdcb18PLIQMaJGZCNVPE1";
    const url = `https://${domain}.microcms.io/api/v1/blogs`;

    try {
        const response = await fetch(url, {
            headers: {
                'X-MICROCMS-API-KEY': apiKey
            }
        });
        const data = await response.json();
        if (response.ok) {
            console.log('Success: Total blogs =', data.totalCount);
        } else {
            console.error('Error Status:', response.status);
            console.error('Error Body:', data);
        }
    } catch (err) {
        console.error('Fetch Error:', err.message);
    }
}

test();
