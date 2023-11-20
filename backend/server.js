import express from 'express';
import mongoose from 'mongoose';
import { check, validationResult } from 'express-validator';
import winston from 'winston'; // Importa o pacote winston

// Cria uma nova instância do logger do winston
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.json(),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Adiciona o transporte de console se não estiver em produção
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

const app = express();
app.use(express.json());

// Adiciona o middleware para permitir CORS
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Configurações do MongoDB
const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test';

(async () => {
  try {
    await mongoose.connect(uri, {});
    logger.info('Conexão com o banco de dados realizada com sucesso!');
  } catch (error) {
    logger.error('Erro na conexão com o banco de dados:', error);
  }
})();

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'Erro na conexão com o banco de dados:'));
db.once('open', () => {
  logger.info('Conexão com o banco de dados realizada com sucesso!');
});

// Cria o modelo de usuário
const UserSchema = new mongoose.Schema({
  nome: String,
  email: String,
  senha: String,
});

const User = mongoose.model('User', UserSchema);

// Rota para verificar se o e-mail já está cadastrado
app.post('/verificar-email', async (req, res) => {
  const { email } = req.body;

  try {
    // Verifica se o e-mail já existe
    const existingUser = await User.findOne({ email });

    res.status(200).json({ emailExists: !!existingUser });
  } catch (err) {
    res.status(500).send({
      error: err.message,
    });
  }
});


// Rota para cadastrar usuário
app.post('/cadastro', [
  check('nome').notEmpty().withMessage('O nome é obrigatório.'),
  check('email').isEmail().withMessage('O e-mail é inválido.'),
  check('senha').isLength({ min: 6 }).withMessage('A senha deve ter no mínimo 6 caracteres.'),
], async (req, res) => {
  // Verifica se há erros de validação
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { nome, email, senha } = req.body;

  try {
    // Verifica se o e-mail já existe
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        error: 'Este e-mail já está em uso.',
      });
    }

    // Cria o novo usuário
    const user = new User({
      nome,
      email,
      senha,
    });

    // Salva o usuário no banco de dados
    await user.save();

    // Sucesso!
    return res.status(201).json({
      message: 'Usuário cadastrado com sucesso.',
    });
  } catch (err) {
    logger.error('Erro no servidor:', err);
    res.status(500).json({
      error: err.message,
    });
  }
});


// Rota para autenticar usuário
app.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  try {
    const user = await User.findOne({ email, senha });

    if (!user) {
      return res.status(401).json({
        error: 'Credenciais inválidas.',
      });
    }

    // Você pode adicionar lógica adicional para gerar um token JWT ou configurar a sessão do usuário aqui

    return res.status(200).json({
      message: 'Usuário autenticado com sucesso.',
    });
  } catch (err) {
    logger.error('Erro no servidor:', err);
    res.status(500).json({
      error: err.message,
    });
  }
});


// Inicia o servidor
app.listen(4000, () => {
  logger.info('Servidor iniciado na porta 4000.');
});