// Cek halaman mana yang sedang dibuka
const isIndexPage = document.getElementById('btnGenerate') !== null;

if (isIndexPage) {
    // ==========================================
    // LOGIKA UNTUK index.html (Upload & Generate)
    // ==========================================
    import("https://esm.sh/@google/generative-ai@0.21.0").then(({ GoogleGenerativeAI }) => {
        const modelInput = document.getElementById('modelImg');
        const productInput = document.getElementById('productImg');
        const previewModel = document.getElementById('previewModel');
        const previewProduct = document.getElementById('previewProduct');
        const btnGenerate = document.getElementById('btnGenerate');
        const statusArea = document.getElementById('statusArea');
        const statusText = document.getElementById('statusText');

        let modelBase64 = null;
        let productBase64 = null;

        // Simpan API Key di sessionStorage agar tidak hilang saat pindah halaman
        document.getElementById('geminiKey').value = sessionStorage.getItem('geminiKey') || '';
        document.getElementById('openaiKey').value = sessionStorage.getItem('openaiKey') || '';

        const fileToBase64 = (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
        });

        modelInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                previewModel.src = URL.createObjectURL(file);
                previewModel.style.display = 'block';
                modelBase64 = await fileToBase64(file);
            }
        });

        productInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                previewProduct.src = URL.createObjectURL(file);
                previewProduct.style.display = 'block';
                productBase64 = await fileToBase64(file);
            }
        });

        btnGenerate.addEventListener('click', async () => {
            const geminiKey = document.getElementById('geminiKey').value.trim();
            const openaiKey = document.getElementById('openaiKey').value.trim();
            const narasi = document.getElementById('narrationText').value.trim();
            
            if (!geminiKey || !openaiKey) return alert("Masukkan kedua API Key terlebih dahulu!");
            if (!modelBase64 || !productBase64) return alert("Upload Foto Model dan Foto Produk terlebih dahulu!");

            // Simpan API key ke session
            sessionStorage.setItem('geminiKey', geminiKey);
            sessionStorage.setItem('openaiKey', openaiKey);

            // UI State
            btnGenerate.disabled = true;
            statusArea.classList.remove('hidden');
            statusText.innerText = "Langkah 1: Gemini sedang menganalisis gambar...";

            try {
                // LANGKAH 1: GEMINI
                const genAI = new GoogleGenerativeAI(geminiKey);
                const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

                const promptAnalisis = `
                    Anda adalah seorang fotografer profesional dan ahli fashion.
                    Tugas Anda adalah membuat "Prompt" bahasa Inggris yang sangat detail untuk AI Image Generator (seperti DALL-E 3).
                    Tujuannya: Menggantikan pakaian pria di Gambar 1 dengan baju dari Gambar 2.
                    ${narasi ? `Tambahkan juga elemen suasana berikut ke dalam prompt: "${narasi}"` : ''}
                    Instruksi: Deskripsikan wajah, gaya rambut, kacamata, pose, dan latar belakang pria di Gambar 1. Deskripsikan pakaian di Gambar 2. 
                    Format output HANYA teks prompt bahasa Inggris: "A realistic portrait of [deskripsi pria] wearing [deskripsi pakaian]. Cinematic lighting, 8k resolution, highly detailed."
                `;

                const resultGemini = await geminiModel.generateContent([
                    promptAnalisis,
                    { inlineData: { data: modelBase64, mimeType: "image/jpeg" } },
                    { inlineData: { data: productBase64, mimeType: "image/jpeg" } }
                ]);

                const finalPrompt = resultGemini.response.text().trim();
                console.log("Prompt dari Gemini:", finalPrompt);

                // LANGKAH 2: OPENAI
                statusText.innerText = "Langkah 2: OpenAI (DALL-E 3) sedang melukis gambar...";

                const responseOpenAI = await fetch("https://api.openai.com/v1/images/generations", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${openaiKey}`
                    },
                    body: JSON.stringify({
                        model: "dall-e-3",
                        prompt: finalPrompt,
                        n: 1,
                        size: "1024x1024",
                        response_format: "url"
                    })
                });

                const dataOpenAI = await responseOpenAI.json();
                if (dataOpenAI.error) throw new Error(dataOpenAI.error.message);

                const imageUrl = dataOpenAI.data[0].url;

                // Simpan URL gambar ke sessionStorage dan pindah halaman
                sessionStorage.setItem('generatedImageUrl', imageUrl);
                window.location.href = 'result.html';

            } catch (error) {
                console.error(error);
                alert("Terjadi kesalahan: " + error.message);
                statusArea.classList.add('hidden');
                btnGenerate.disabled = false;
            }
        });
    });

} else {
    // ==========================================
    // LOGIKA UNTUK result.html (Menampilkan Hasil)
    // ==========================================
    const resultImage = document.getElementById('resultImage');
    const emptyState = document.getElementById('emptyState');
    const resultArea = document.getElementById('resultArea');
    const downloadBtn = document.getElementById('downloadBtn');
    
    const imageUrl = sessionStorage.getItem('generatedImageUrl');

    if (imageUrl) {
        emptyState.classList.add('hidden');
        resultArea.classList.remove('hidden');
        resultImage.src = imageUrl;

        downloadBtn.onclick = async () => {
            try {
                const imgRes = await fetch(imageUrl);
                const blob = await imgRes.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'ai-tryon-result.png';
                a.click();
                window.URL.revokeObjectURL(url);
            } catch (e) {
                alert("Gagal mengunduh, silakan klik kanan gambar dan pilih 'Save Image As'.");
            }
        };
    } else {
        // Jika tidak ada data
        emptyState.classList.remove('hidden');
        resultArea.classList.add('hidden');
    }
}