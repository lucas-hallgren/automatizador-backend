// 1. Importar as dependências
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const session = require('express-session');
const axios = require('axios');

// 2. Configurar o dotenv
dotenv.config();

// --- INÍCIO DA CONFIGURAÇÃO DO PASSPORT ---
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// ** CORREÇÃO 1: URL de Callback Completa e Segura **
// Forçamos o uso do endereço HTTPS completo para garantir que não haja confusão.
passport.use(new FacebookStrategy({
    clientID: process.env.META_APP_ID,
    clientSecret: process.env.META_APP_SECRET,
    callbackURL: "https://automatizador-backend.onrender.com/auth/facebook/callback",
    // ***** ALTERAÇÃO PARA DEBUG *****
    // Temporariamente pedimos apenas a permissão de email para testar o fluxo de login.
    scope: ['email']
  },
  (accessToken, refreshToken, profile, done) => {
    const userData = {
        profile: profile,
        accessToken: accessToken
    };
    return done(null, userData);
  }
));
// --- FIM DA CONFIGURAÇÃO DO PASSPORT ---

const app = express();
const PORT = process.env.PORT || 10000;

// Habilitar confiança no proxy para o Express funcionar corretamente com HTTPS na Render
app.set('trust proxy', 1);

// 5. Configurar os middlewares
app.use(cors());
app.use(express.json());

// ** CORREÇÃO 2: Configuração de Cookie de Sessão Segura **
// Garantimos que o cookie de sessão só seja enviado através de HTTPS.
app.use(session({
    secret: 'uma frase secreta muito forte para relatorios',
    resave: false,
    saveUninitialized: false,
    proxy: true, // Necessário para funcionar atrás do proxy da Render
    cookie: {
        secure: true, // Garante que o cookie só seja enviado por HTTPS
        sameSite: 'none' // Necessário para iframes/redirecionamentos de terceiros
    }
}));
app.use(passport.initialize());
app.use(passport.session());

// Função para checar se o usuário está autenticado
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: 'Não autorizado. Por favor, faça o login.' });
}

// 6. Criar as rotas
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    res.send(`
        <h1>Backend do Automatizador de Relatórios</h1>
        <p>Você está autenticado como: ${req.user.profile.displayName}</p>
        <hr>
        <h3>O que fazer agora?</h3>
        <p>Use o link abaixo para buscar todas as contas de anúncio que seu usuário gerencia.</p>
        <a href="/api/ad-accounts">Buscar Contas de Anúncio</a>
        <br><br>
        <a href="/api/profile">Ver seu Perfil e Access Token</a>
        <br>
        <a href="/auth/logout">Sair</a>
    `);
  } else {
    res.send('<h1>Backend do Automatizador de Relatórios</h1><p>Por favor, faça o login para continuar.</p><a href="/auth/facebook">Fazer Login com o Facebook</a>');
  }
});

// Rotas de políticas
app.get('/privacy', (req, res) => { res.send('<h1>Política de Privacidade</h1><p>Placeholder.</p>'); });
app.get('/data-deletion', (req, res) => { res.send('<h1>Instruções de Exclusão de Dados</h1><p>Placeholder.</p>'); });

// Rotas de Autenticação
app.get('/auth/facebook', passport.authenticate('facebook'));
app.get('/auth/facebook/callback',
  passport.authenticate('facebook', {
    successRedirect: '/',
    failureRedirect: '/auth/error'
  })
);
app.get('/auth/error', (req, res) => { res.send('<h1>Erro na autenticação.</h1><a href="/">Tentar novamente</a>'); });
app.get('/auth/logout', (req, res) => { req.logout(() => res.redirect('/')); });

// Rotas da API
app.get('/api/profile', ensureAuthenticated, (req, res) => {
    res.json(req.user);
});

app.get('/api/ad-accounts', ensureAuthenticated, async (req, res) => {
    const userAccessToken = req.user.accessToken;
    const apiUrl = `https://graph.facebook.com/v20.0/me/adaccounts?fields=name,account_id,business_name&access_token=${userAccessToken}`;

    try {
        const response = await axios.get(apiUrl);
        res.json(response.data);
    } catch (error) {
        console.error("Erro ao buscar contas de anúncio:", error.response ? error.response.data : error.message);
        res.status(500).json({ message: "Erro ao buscar contas de anúncio", error: error.response ? error.response.data : error.message });
    }
});

// 7. Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}.`);
});
