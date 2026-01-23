<?php
// Configurações de cabeçalho
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Allow-Headers: Content-Type");

// Dados de conexão
$host = "localhost";
$user = "root";
$pass = "usbw"; 
$db   = "bio_biblio";

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    echo json_encode(["erro" => "Falha na conexão: " . $conn->connect_error]);
    exit;
}

$conn->set_charset("utf8");

$metodo = $_SERVER['REQUEST_METHOD'];
$json = file_get_contents("php://input");
$dados = json_decode($json, true);

// --- LÓGICA DE CONSULTA (GET) ---
if ($metodo === 'GET') {
    $tipo = isset($_GET['tipo']) ? $_GET['tipo'] : 'livros';
    
    if ($tipo === 'alunos') {
        $sql = "SELECT * FROM alunos ORDER BY nome ASC";
    } 
    elseif ($tipo === 'consultas') {
        $sql = "SELECT livros.titulo, alunos.nome as aluno_nome, alunos.ra, 
                       livros.data_emprestimo, livros.data_devolucao_prevista 
                 FROM livros 
                 INNER JOIN alunos ON livros.aluno_id = alunos.id 
                 WHERE livros.status = 'Emprestado'";
    } 
    else {
        $sql = "SELECT * FROM livros ORDER BY id DESC";
    }

    $resultado = $conn->query($sql);
    $lista = [];
    while ($linha = $resultado->fetch_assoc()) {
        $lista[] = $linha;
    }
    echo json_encode($lista);
} 

// --- LÓGICA DE AÇÕES (POST) ---
elseif ($metodo === 'POST') {
    if (!isset($dados['acao'])) {
        echo json_encode(["erro" => "Ação não definida"]);
        exit;
    }

    $acao = $dados['acao'];

    // 1. LOGIN
    if ($acao === 'login') {
        $stmt = $conn->prepare("SELECT id, senha FROM usuarios WHERE usuario = ?");
        $stmt->bind_param("s", $dados['usuario']);
        $stmt->execute();
        $resultado = $stmt->get_result();

        if ($resultado->num_rows === 1) {
            $userBD = $resultado->fetch_assoc();
            if ($dados['senha'] === $userBD['senha']) {
                echo json_encode(["sucesso" => true]);
            } else {
                echo json_encode(["sucesso" => false, "erro" => "Senha incorreta"]);
            }
        } else {
            echo json_encode(["sucesso" => false, "erro" => "Usuário não encontrado"]);
        }
    }

    // 2. CADASTRAR ALUNO
    elseif ($acao === 'cadastrar_aluno') {
        $stmt = $conn->prepare("INSERT INTO alunos (nome, ra, email, telefone, cep, rua, numero, bairro, cidade, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("ssssssssss", 
            $dados['nome'], $dados['ra'], $dados['email'], $dados['telefone'],
            $dados['cep'], $dados['rua'], $dados['numero'], $dados['bairro'], 
            $dados['cidade'], $dados['estado']
        );
        if ($stmt->execute()) {
            echo json_encode(["sucesso" => true]);
        } else {
            echo json_encode(["sucesso" => false, "erro" => "Erro ao cadastrar: " . $conn->error]);
        }
    }

    // 3. EDITAR ALUNO
    elseif ($acao === 'editar_aluno') {
        $stmt = $conn->prepare("UPDATE alunos SET nome = ?, ra = ?, email = ?, telefone = ?, cep = ?, rua = ?, numero = ?, bairro = ?, cidade = ?, estado = ? WHERE id = ?");
        $stmt->bind_param("ssssssssssi", 
            $dados['nome'], $dados['ra'], $dados['email'], $dados['telefone'],
            $dados['cep'], $dados['rua'], $dados['numero'], $dados['bairro'], 
            $dados['cidade'], $dados['estado'], $dados['id']
        );
        
        if ($stmt->execute()) {
            echo json_encode(["sucesso" => true]);
        } else {
            echo json_encode(["sucesso" => false, "erro" => "Erro ao atualizar: " . $conn->error]);
        }
    }

    // 4. ELIMINAR ALUNO
    elseif ($acao === 'eliminar_aluno') {
        $aluno_id = $dados['id'];
        $check = $conn->prepare("SELECT COUNT(*) as total FROM livros WHERE aluno_id = ? AND status = 'Emprestado'");
        $check->bind_param("i", $aluno_id);
        $check->execute();
        $resCheck = $check->get_result()->fetch_assoc();

        if ($resCheck['total'] > 0) {
            echo json_encode(["sucesso" => false, "erro" => "Não é possível excluir! Aluno possui livros pendentes."]);
        } else {
            $stmt = $conn->prepare("DELETE FROM alunos WHERE id = ?");
            $stmt->bind_param("i", $aluno_id);
            if ($stmt->execute()) {
                echo json_encode(["sucesso" => true]);
            } else {
                echo json_encode(["sucesso" => false, "erro" => "Erro ao excluir."]);
            }
        }
    }

    // 5. VINCULAR EMPRÉSTIMO
    elseif ($acao === 'vincular_emprestimo') {
        $aluno_id = $dados['aluno_id'];
        $check = $conn->prepare("SELECT COUNT(*) as total FROM livros WHERE aluno_id = ? AND status = 'Emprestado'");
        $check->bind_param("i", $aluno_id);
        $check->execute();
        $resCheck = $check->get_result()->fetch_assoc();

        if ($resCheck['total'] >= 2) {
            echo json_encode(["sucesso" => false, "erro" => "Limite atingido! Máximo 2 livros por aluno."]);
            exit;
        }

        $stmt = $conn->prepare("UPDATE livros SET status = 'Emprestado', aluno_id = ?, data_emprestimo = ?, data_devolucao_prevista = ? WHERE id = ?");
        $stmt->bind_param("issi", $aluno_id, $dados['data_emprestimo'], $dados['data_devolucao'], $dados['livro_id']);
        
        if ($stmt->execute()) {
            echo json_encode(["sucesso" => true]);
        } else {
            echo json_encode(["sucesso" => false, "erro" => "Erro no empréstimo."]);
        }
    }

    // 6. CADASTRAR LIVRO
    elseif ($acao === 'cadastrar_livro') {
        $stmt = $conn->prepare("INSERT INTO livros (titulo, autor, isbn, editora, genero, ano_publicacao, edicao, sinopse, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Disponível')");
        $stmt->bind_param("sssssiss", 
            $dados['titulo'], 
            $dados['autor'], 
            $dados['isbn'], 
            $dados['editora'], 
            $dados['genero'], 
            $dados['ano_publicacao'], 
            $dados['edicao'], 
            $dados['sinopse']
        );
        
        if ($stmt->execute()) {
            echo json_encode(["sucesso" => true]);
        } else {
            echo json_encode(["sucesso" => false, "erro" => "Erro ao cadastrar livro: " . $conn->error]);
        }
    } 

    // 7. ATUALIZAR STATUS / DEVOLUÇÃO
    elseif ($acao === 'atualizar') {
        $stmt = $conn->prepare("UPDATE livros SET status = ?, aluno_id = NULL, data_emprestimo = NULL, data_devolucao_prevista = NULL WHERE id = ?");
        $stmt->bind_param("si", $dados['status'], $dados['id']);
        $stmt->execute();
        echo json_encode(["sucesso" => true]);
    } 

    // 8. ELIMINAR LIVRO (COM REGRA DE PROTEÇÃO)
    elseif ($acao === 'eliminar') {
        $livro_id = $dados['id'];

        // VERIFICAÇÃO: O livro está emprestado?
        $check = $conn->prepare("SELECT status FROM livros WHERE id = ?");
        $check->bind_param("i", $livro_id);
        $check->execute();
        $res = $check->get_result()->fetch_assoc();

        if ($res && (strtolower($res['status']) === 'emprestado')) {
            echo json_encode(["sucesso" => false, "erro" => "Bloqueio: Não é possível excluir um livro que está emprestado!"]);
        } else {
            $stmt = $conn->prepare("DELETE FROM livros WHERE id = ?");
            $stmt->bind_param("i", $livro_id);
            if ($stmt->execute()) {
                echo json_encode(["sucesso" => true]);
            } else {
                echo json_encode(["sucesso" => false, "erro" => "Erro ao excluir o livro."]);
            }
        }
    }

    // 9. EDITAR LIVRO
    elseif ($acao === 'editar_livro') {
        $stmt = $conn->prepare("UPDATE livros SET titulo = ?, autor = ?, isbn = ?, editora = ?, genero = ?, ano_publicacao = ?, edicao = ?, sinopse = ? WHERE id = ?");
        $stmt->bind_param("sssssissi", 
            $dados['titulo'], 
            $dados['autor'], 
            $dados['isbn'], 
            $dados['editora'], 
            $dados['genero'], 
            $dados['ano_publicacao'], 
            $dados['edicao'], 
            $dados['sinopse'],
            $dados['id']
        );

        if ($stmt->execute()) {
            echo json_encode(["sucesso" => true]);
        } else {
            echo json_encode(["sucesso" => false, "erro" => "Erro ao atualizar livro: " . $conn->error]);
        }
    }
}

$conn->close();
?>