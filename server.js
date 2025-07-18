// 1. Importar as dependências
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const session = require('express-session');

// 2. Configurar o dotenv para ler o ficheiro .env
dotenv.config();

// --- INÍCIO DA CONFIGURAÇÃO DO PASSPORT ---

// Para o Passport se lembrar de um utilizador entre requisições,
// ele precisa de guardar uma pequena informação na sessão (o ID do utilizador).
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// Configurar a estratégia de login com o Facebook
passport.use(new FacebookStrategy({
    clientID: process.env.META_APP_ID,
    clientSecret: process.env.META_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/callback",
    // Pedimos permissão para aceder ao perfil e às contas de anúncios
    scope: ['email', 'read_insights', 'ads_read', 'business_management']
  },
  (accessToken, refreshToken, profile, done) => {
    // Esta função é chamada quando o Facebook retorna com sucesso.
    // O 'accessToken' é a chave que usaremos para fazer chamadas à API.
    console.log("Login bem-sucedido! Perfil:", profile);
    // Guardamos o token e o perfil para usar mais tarde
    const userData = {
        profile: profile,
        accessToken: accessToken
    };
    return done(null, userData);
  }
));
// --- FIM DA CONFIGURAÇÃO DO PASSPORT ---

// 3. Iniciar o aplicativo express
const app = express();

// 4. Definir a porta a partir do ficheiro .env ou usar 3000 como padrão
const PORT = process.env.PORT || 3000;

// 5. Configurar os "middlewares" (funções que preparam nosso servidor)
app.use(cors()); // Habilita o CORS para permitir comunicação entre frontend e backend
app.use(express.json()); // Permite que o servidor entenda requisições com corpo em JSON

// Configurar a sessão para o Passport
app.use(session({
    secret: 'uma frase secreta muito forte para relatorios', // Mude isto para qualquer frase
    resave: false,
    saveUninitialized: false
}));

// Iniciar o Passport e a sessão
app.use(passport.initialize());
app.use(passport.session());

// 6. Criar as rotas

// Rota principal
app.get('/', (req, res) => {
  // Se o utilizador estiver logado, mostramos um link para ver o perfil.
  if (req.isAuthenticated()) {
    res.send(`
        <h1>Backend do Automatizador de Relatórios</h1>
        <p>Você está autenticado!</p>
        <a href="/api/profile">Ver Perfil e Access Token</a>
        <br>
        <a href="/auth/logout">Sair</a>
    `);
  } else {
    res.send('<h1>Backend do Automatizador de Relatórios</h1><p>Por favor, faça o login para continuar.</p><a href="/auth/facebook">Fazer Login com o Facebook</a>');
  }
});

// Rota para a política de privacidade (necessária para o modo de produção)
app.get('/privacy', (req, res) => {
    res.send('<h1>Política de Privacidade</h1><p>Esta é uma política de privacidade de placeholder para o desenvolvimento do aplicativo de relatórios.</p>');
});

// Rota para a exclusão de dados (necessária para o modo de produção)
app.get('/data-deletion', (req, res) => {
    res.send('<h1>Instruções de Exclusão de Dados</h1><p>Para excluir os seus dados, por favor, remova o aplicativo da sua lista de integrações de negócios no Facebook.</p>');
});


// Rota para iniciar a autenticação com o Facebook
// Ao aceder aqui, o utilizador será redirecionado para o Facebook.
app.get('/auth/facebook', passport.authenticate('facebook'));

// Rota de callback que o Facebook chama após o login
// O Passport trata da troca de código por token automaticamente.
app.get('/auth/facebook/callback',
  passport.authenticate('facebook', {
    successRedirect: '/', // Se der certo, volta para a página inicial
    failureRedirect: '/auth/error' // Se der erro, vai para uma página de erro
  })
);

// Rota de erro de autenticação
app.get('/auth/error', (req, res) => {
    res.send('<h1>Ocorreu um erro durante a autenticação.</h1><a href="/">Tentar novamente</a>');
});

// Rota para fazer logout
app.get('/auth/logout', (req, res) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

// Rota protegida para ver os dados do perfil (só funciona se estiver logado)
app.get('/api/profile', (req, res) => {
  if (req.isAuthenticated()) {
    // O objeto 'user' é o que guardámos na sessão (perfil + accessToken)
    res.json(req.user);
  } else {
    res.status(401).json({ message: 'Não autorizado. Por favor, faça o login.' });
  }
});


// 7. Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}.`);
  console.log(`Acesse http://localhost:${PORT} para iniciar o login.`);
});
