// 1) CONFIG DO SEU FIREBASE
// Pegue em: Firebase Console > Configurações do projeto > Seus apps > CDN
const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  // se quiser usar outros recursos, adicione aqui
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Referências do DOM
const listaPedidosEl = document.getElementById("listaPedidos");
const pedidoTemplate = document.getElementById("pedidoTemplate");
const connectionDot = document.getElementById("connectionDot");
const toastEl = document.getElementById("toast");

let filtroStatus = "todos";
let pedidosCache = [];

// 2) Listener em tempo real na coleção "pedidos"
db.collection("pedidos")
  .orderBy("createdAt", "desc")
  .onSnapshot(
    (snapshot) => {
      connectionDot.classList.add("status-online");
      connectionDot.classList.remove("status-offline");

      pedidosCache = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      renderPedidos();
    },
    (error) => {
      console.error("Erro ao ouvir pedidos:", error);
      connectionDot.classList.remove("status-online");
      connectionDot.classList.add("status-offline");
    }
  );

// 3) Renderizar pedidos na tela
function renderPedidos() {
  listaPedidosEl.innerHTML = "";

  const filtrados =
    filtroStatus === "todos"
      ? pedidosCache
      : pedidosCache.filter((p) => p.status === filtroStatus);

  if (filtrados.length === 0) {
    const vazio = document.createElement("p");
    vazio.style.color = "#9ca3af";
    vazio.style.fontSize = "0.85rem";
    vazio.style.textAlign = "center";
    vazio.style.marginTop = "16px";
    vazio.innerText =
      filtroStatus === "todos"
        ? "Nenhum pedido no momento."
        : "Nenhum pedido com esse status.";
    listaPedidosEl.appendChild(vazio);
    return;
  }

  filtrados.forEach((pedido) => {
    const clone = pedidoTemplate.content.cloneNode(true);
    const card = clone.querySelector(".pedido-card");

    // Campos
    const idEl = clone.querySelector(".pedido-id");
    const clienteEl = clone.querySelector(".pedido-cliente");
    const enderecoEl = clone.querySelector(".pedido-endereco");
    const itensEl = clone.querySelector(".pedido-itens");
    const pagamentoEl = clone.querySelector(".pedido-pagamento");
    const horaEl = clone.querySelector(".pedido-hora");
    const badge = clone.querySelector(".badge-status");
    const botoesStatus = clone.querySelectorAll(".btn-status");

    idEl.textContent = `Pedido #${pedido.numero ?? pedido.id}`;
    clienteEl.textContent = pedido.clienteNome ?? "Cliente não informado";
    enderecoEl.textContent =
      pedido.endereco ?? (pedido.retirada ? "Retirada no balcão" : "");

    // Itens (array)
    const lista = document.createElement("ul");
    (pedido.itens ?? []).forEach((item) => {
      const li = document.createElement("li");
      if (item.tipo === "pizza") {
        li.textContent = `${item.tamanho ?? ""} – ${item.sabor ?? ""}${
          item.borda ? ` (borda: ${item.borda})` : ""
        }`;
      } else if (item.tipo === "bebida") {
        li.textContent = `Bebida – ${item.descricao ?? ""}`;
      } else {
        li.textContent = item.descricao ?? JSON.stringify(item);
      }
      lista.appendChild(li);
    });
    itensEl.appendChild(lista);

    pagamentoEl.textContent = `Pagamento: ${pedido.pagamento ?? "N/I"}`;

    // Hora
    let horaTxt = "";
    if (pedido.horaPedido) {
      horaTxt = pedido.horaPedido;
    } else if (pedido.createdAt && pedido.createdAt.toDate) {
      const d = pedido.createdAt.toDate();
      horaTxt = d.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      horaTxt = "";
    }
    horaEl.textContent = horaTxt ? `Hora: ${horaTxt}` : "";

    // Badge status
    const status = pedido.status ?? "novo";
    badge.textContent = statusLabel(status);
    badge.classList.add(`badge-${status}`);

    // Botões para atualizar status
    botoesStatus.forEach((btn) => {
      const nextStatus = btn.dataset.next;
      if (nextStatus === status) {
        btn.style.background = "rgba(148, 163, 184, 0.15)";
      }

      btn.addEventListener("click", () =>
        atualizarStatus(pedido.id, nextStatus)
      );
    });

    listaPedidosEl.appendChild(clone);
  });
}

function statusLabel(status) {
  switch (status) {
    case "novo":
      return "Novo";
    case "preparo":
      return "Em preparo";
    case "entrega":
      return "Saiu p/ entrega";
    case "finalizado":
      return "Finalizado";
    default:
      return status;
  }
}

// 4) Atualizar status no Firestore
function atualizarStatus(idDoc, novoStatus) {
  db.collection("pedidos")
    .doc(idDoc)
    .update({ status: novoStatus })
    .then(() => {
      mostrarToast("Status atualizado para: " + statusLabel(novoStatus));
    })
    .catch((err) => {
      console.error("Erro ao atualizar status:", err);
      mostrarToast("Erro ao atualizar.", true);
    });
}

// 5) Filtro de chips
document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document
      .querySelectorAll(".chip")
      .forEach((c) => c.classList.remove("chip-active"));
    chip.classList.add("chip-active");

    filtroStatus = chip.dataset.status;
    renderPedidos();
  });
});

// 6) Toast
let toastTimeout;
function mostrarToast(msg, erro = false) {
  toastEl.textContent = msg;
  toastEl.style.background = erro ? "#ef4444" : "#10b981";
  toastEl.classList.add("toast-show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastEl.classList.remove("toast-show");
  }, 1800);
}
