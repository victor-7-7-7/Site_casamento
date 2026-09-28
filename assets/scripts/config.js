/* EDITE AQUI. Nunca coloque chaves secretas neste arquivo.
Fotos ilustrativas: substitua por assets/images/sua-foto.jpg e ajuste os textos alternativos.
Campos vazios desativam integrações; nenhum envio ou pagamento é simulado. */
window.WEDDING_CONFIG = {
  bride: '[NOME DA NOIVA]',
  groom: '[NOME DO NOIVO]',
  monogram: 'N & N',
  dateISO: '', // Formato: 2027-10-16T16:00:00-03:00
  timeZone: 'America/Sao_Paulo',
  dateLabel: '[DATA DO CASAMENTO]',
  timeLabel: '[HORÁRIO DA CERIMÔNIA]',
  welcome: '[MENSAGEM DE ABERTURA ESCRITA PELO CASAL]',
  verse: '[VERSÍCULO ESCOLHIDO PELO CASAL]',
  verseReference: '[REFERÊNCIA DO VERSÍCULO]',
  story: '[NOSSA HISTÓRIA — conte aqui, com as suas palavras, como tudo começou e o que torna esse caminho tão especial.]',
  closing: '[MENSAGEM FINAL ESCRITA PELO CASAL]',
  afterEvent: 'O sim foi só o começo. Obrigado por fazer parte da nossa história!',
  rsvpDeadline: '[PRAZO PARA CONFIRMAÇÃO]',
  proposalDescription: '[DESCRIÇÃO DO PEDIDO ESCRITA PELO CASAL]',
  videoAvailable: false, // true após adicionar assets/videos/pedido-casamento.mp4
  videoCaptions: '', // caminho de arquivo .vtt com legendas
  venue: { name: '[NOME DO LOCAL]', address: '[ENDEREÇO COMPLETO]', mapUrl: '', notes: '[INFORMAÇÕES SOBRE ACESSO E ESTACIONAMENTO]' },
  pix: { key: '', recipient: '[NOME DO RECEBEDOR]' },
  supabase: { url: '', publishableKey: '' },
  photosAreIllustrative: true,
  photos: {
    hero: { src: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2000&q=85', alt: 'Fotografia ilustrativa de uma celebração de casamento', position: 'center 50%' },
    story: { src: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=900&q=80', alt: 'Fotografia ilustrativa de um casal — substituir por foto da nossa história' },
    old: { src: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=600&q=80', alt: 'Fotografia ilustrativa — substituir por uma foto antiga' },
    closing: { src: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1800&q=85', alt: 'Fotografia ilustrativa de casamento — substituir por foto do casal' }
  },
  gallery: [
    { src: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=700&q=80', alt: 'Foto ilustrativa para uma memória antiga', caption: '[NOSSO COMEÇO]' },
    { src: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=900&q=80', alt: 'Foto ilustrativa para uma memória atual', caption: '[NOSSO AGORA]' },
    { src: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=700&q=80', alt: 'Foto ilustrativa para um momento especial', caption: '[UM DIA ESPECIAL]' },
    { src: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=700&q=80', alt: 'Foto ilustrativa para uma memória do casal', caption: '[MAIS UMA MEMÓRIA]' }
  ],
  // Presentes, status e valores de exemplo. Edite antes de publicar.
  gifts: [
    { name: 'Café da manhã a dois', description: 'Um jogo de xícaras para começar os dias juntos.', price: 180, status: 'disponivel', url: '', image: 'assets/images/presente.svg' },
    { name: 'Mesa cheia de histórias', description: 'Louças para os encontros no nosso novo lar.', price: 350, status: 'disponivel', url: '', image: 'assets/images/presente.svg' },
    { name: 'Receitas de uma nova vida', description: 'Utensílios para nossas aventuras na cozinha.', price: 250, status: 'reservado', url: '', image: 'assets/images/presente.svg' },
    { name: 'Um brinde ao nosso amor', description: 'Taças para celebrar cada pequena conquista.', price: 160, status: 'ganhamos', url: '', image: 'assets/images/presente.svg' }
  ],
  symbolicGifts: [
    { name: 'Café na lua de mel', description: 'Uma pausa gostosa entre um passeio e outro.', price: 50, icon: '☕' },
    { name: 'Jantar dos recém-casados', description: 'Uma noite especial para brindar ao começo.', price: 150, icon: '♧' },
    { name: 'Vale: a primeira aventura', description: 'Uma contribuição para colecionar novas memórias.', price: 300, icon: '☀' }
  ],
  party: {
    message: '[MENSAGEM PARA OS PADRINHOS E MADRINHAS]',
    dressCode: '[DRESS CODE DOS PADRINHOS E MADRINHAS]',
    arrival: '[HORÁRIO DE CHEGADA DOS PADRINHOS]',
    palette: [{ color: '#818974', name: 'Oliva (sugestão)' }, { color: '#b69382', name: 'Terracota (sugestão)' }, { color: '#c6b8a1', name: 'Areia (sugestão)' }],
    paletteNote: '[ORIENTAÇÕES SOBRE AS CORES — paleta ilustrativa]',
    notes: '[OBSERVAÇÕES OPCIONAIS PARA OS PADRINHOS]'
  }
};
