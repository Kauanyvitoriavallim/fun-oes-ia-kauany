// Referências DOM
const inputPergunta = document.getElementById("user-question");
const btnPerguntar = document.getElementById("btn-ask");
const caixaResposta = document.getElementById("response-box");
const textoResposta = document.getElementById("answer-text");
const linkNoticia = document.getElementById("news-link");
const btnTTS = document.getElementById("btn-tts");
const ttsLabel = document.getElementById("tts-label");
const tagsSugestao = document.querySelectorAll(".tag");

// Configuração do Sintetizador de Voz
const synth = window.speechSynthesis;
let respostaAtual = "";

/**
 * Consulta a API Instant Answer do DuckDuckGo e faz fallback para a Wikipédia se necessário
 */
async function pesquisarDuckDuckGo(pergunta) {
    if (!pergunta.trim()) return;

    // Cancela leitura de voz em andamento
    if (synth.speaking) {
        synth.cancel();
        atualizarBotaoVoz(false);
    }

    caixaResposta.classList.remove("hidden");
    textoResposta.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Consultando DuckDuckGo...';
    linkNoticia.classList.add("hidden");

    const termoFormatado = encodeURIComponent(pergunta);
    // Endpoint oficial da API do DuckDuckGo
    const duckUrl = `https://api.duckduckgo.com/?q=${termoFormatado}&format=json&no_html=1&skip_disambig=1`;

    try {
        const response = await fetch(duckUrl);
        const data = await response.json();

        // 1. Tenta pegar a resposta direta (Abstract) do DuckDuckGo
        if (data.AbstractText && data.AbstractText.trim() !== "") {
            respostaAtual = data.AbstractText;
            textoResposta.textContent = respostaAtual;

            if (data.AbstractURL) {
                linkNoticia.href = data.AbstractURL;
                linkNoticia.classList.remove("hidden");
            }
        } 
        // 2. Tenta obter tópicos relacionados trazidos pelo DuckDuckGo
        else if (data.RelatedTopics && data.RelatedTopics.length > 0 && data.RelatedTopics[0].Text) {
            respostaAtual = data.RelatedTopics[0].Text;
            textoResposta.textContent = respostaAtual;

            if (data.RelatedTopics[0].FirstURL) {
                linkNoticia.href = data.RelatedTopics[0].FirstURL;
                linkNoticia.classList.remove("hidden");
            }
        } 
        // 3. Fallback: Se o DuckDuckGo não tiver o resumo exato, busca o tema via Wikipédia
        else {
            await buscarFallbackWikipedia(pergunta);
        }
    } catch (error) {
        console.warn("Falha na consulta ao DuckDuckGo, tentando método secundário...", error);
        await buscarFallbackWikipedia(pergunta);
    }
}

/**
 * Método de suporte via API da Wikipédia caso o DuckDuckGo não traga o texto em resumo
 */
async function buscarFallbackWikipedia(termo) {
    const termoLimpo = termo.replace(/por que|porque|como|o que e|qual e|onde/gi, '').trim();
    const termoFinal = termoLimpo.length > 2 ? termoLimpo : termo;

    try {
        const searchUrl = `https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(termoFinal + " mar oceano")}&utf8=&format=json&origin=*`;
        const res = await fetch(searchUrl);
        const searchData = await res.json();

        if (searchData.query && searchData.query.search.length > 0) {
            const pageTitle = searchData.query.search[0].title;
            const summaryUrl = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;
            
            const summaryRes = await fetch(summaryUrl);
            const summaryData = await summaryRes.json();

            if (summaryData.extract) {
                respostaAtual = summaryData.extract;
                textoResposta.textContent = respostaAtual;
                linkNoticia.href = summaryData.content_urls.desktop.page;
                linkNoticia.classList.remove("hidden");
                return;
            }
        }
        exibirMensagemVazia(termo);
    } catch (err) {
        textoResposta.textContent = "Erro ao buscar dados na internet. Verifique sua conexão e tente novamente.";
    }
}

function exibirMensagemVazia(termo) {
    respostaAtual = `Não encontramos um resumo automático no DuckDuckGo para "${termo}". Tente reescrever a pergunta usando termos mais diretos como "Baleia-Azul" ou "Água-viva".`;
    textoResposta.textContent = respostaAtual;
    linkNoticia.classList.add("hidden");
}

// Sintetizador de Voz (Text-To-Speech)
function alternarVoz() {
    if (!respostaAtual) return;

    if (synth.speaking) {
        synth.cancel();
        atualizarBotaoVoz(false);
        return;
    }

    const utterance = new SpeechSynthesisUtterance(respostaAtual);
    utterance.lang = "pt-BR";
    utterance.rate = 1.0;

    utterance.onstart = () => atualizarBotaoVoz(true);
    utterance.onend = () => atualizarBotaoVoz(false);
    utterance.onerror = () => atualizarBotaoVoz(false);

    synth.speak(utterance);
}

function atualizarBotaoVoz(falando) {
    if (falando) {
        btnTTS.classList.add("speaking");
        ttsLabel.textContent = "Parar Leitura";
    } else {
        btnTTS.classList.remove("speaking");
        ttsLabel.textContent = "Ouvir Voz I.A";
    }
}

// Eventos
btnPerguntar.addEventListener("click", () => {
    pesquisarDuckDuckGo(inputPergunta.value);
});

inputPergunta.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        pesquisarDuckDuckGo(inputPergunta.value);
    }
});

btnTTS.addEventListener("click", alternarVoz);

tagsSugestao.forEach(tag => {
    tag.addEventListener("click", () => {
        const termo = tag.getAttribute("data-q");
        inputPergunta.value = termo;
        pesquisarDuckDuckGo(termo);
    });
});

/* ===================================================
   CENA 3D COM THREE.JS (Fundo Dinâmico do Oceano)
=================================================== */
function init3DBackground() {
    const canvas = document.getElementById('bg-3d');
    const scene = new THREE.Scene();
    
    scene.fog = new THREE.FogExp2(0x020617, 0.025);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    const particleCount = 250;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 60;
        positions[i + 1] = (Math.random() - 0.5) * 60;
        positions[i + 2] = (Math.random() - 0.5) * 60;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: 0x38bdf8,
        size: 0.5,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    function animate() {
        requestAnimationFrame(animate);

        particles.rotation.y += 0.0008;
        particles.rotation.x += 0.0004;

        const posArray = particles.geometry.attributes.position.array;
        for (let i = 1; i < particleCount * 3; i += 3) {
            posArray[i] += 0.015;
            if (posArray[i] > 30) {
                posArray[i] = -30;
            }
        }
        particles.geometry.attributes.position.needsUpdate = true;

        renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

window.addEventListener('DOMContentLoaded', init3DBackground);