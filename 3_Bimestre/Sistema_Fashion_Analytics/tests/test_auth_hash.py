from app import auth


def test_hash_senha_correta_verifica_true():
    hash_gerado = auth.gerar_hash_senha("minhaSenha123")
    assert auth.verificar_senha("minhaSenha123", hash_gerado) is True


def test_hash_senha_errada_verifica_false():
    hash_gerado = auth.gerar_hash_senha("minhaSenha123")
    assert auth.verificar_senha("senhaErrada", hash_gerado) is False


def test_hash_gera_salt_diferente_a_cada_chamada():
    hash_a = auth.gerar_hash_senha("mesmaSenha")
    hash_b = auth.gerar_hash_senha("mesmaSenha")
    assert hash_a != hash_b
    assert auth.verificar_senha("mesmaSenha", hash_a) is True
    assert auth.verificar_senha("mesmaSenha", hash_b) is True


def test_verificar_senha_com_hash_malformado_retorna_false():
    assert auth.verificar_senha("qualquer", "hash-sem-separador") is False
