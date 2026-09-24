// 1. IMPORT FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    onSnapshot,
    deleteDoc,
    doc,
    updateDoc,
    serverTimestamp,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 2. KONFIGURASI FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyBrWXcMX7MEHUTaa2sQ43CN2aK3AikvsBI",
    authDomain: "latihan-azhar.firebaseapp.com",
    projectId: "latihan-azhar",
    storageBucket: "latihan-azhar.firebasestorage.app",
    messagingSenderId: "976386663502",
    appId: "1:976386663502:web:e6edf89939b29101380f1f"
};

// 3. INISIALISASI FIREBASE
const app = initializeApp(firebaseConfig);

// 4. INISIALISASI FIRESTORE
const db = getFirestore(app);

// 5. REFERENSI COLLECTION
const expensesCollection = collection(db, "expenses");

// 6. CEK KONEKSI
console.log("Firebase berhasil dihubungkan!");
console.log("Firestore berhasil diinisialisasi!");

// 7. FORMAT RUPIAH
function formatRupiah(angka) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0
    }).format(angka);
}

// 8. ANGGARAN BULANAN
const anggaranBulanan = 1500000;

// 9. QUERY DATA TERBARU
const q = query(
    expensesCollection,
    orderBy("createdAt", "desc")
);

// 10. AMBIL DATA FIRESTORE
onSnapshot(q, (snapshot) => {
    const list = document.getElementById("expense-list");

    list.innerHTML = "";

    let totalBulanIni = 0;
    let pengeluaranHariIni = 0;

    const today = new Date();

    const tahunSekarang = today.getFullYear();
    const bulanSekarang = today.getMonth();
    const tanggalSekarang = today.getDate();

    // Jika belum ada data
    if (snapshot.empty) {
        list.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    Belum ada data.
                </td>
            </tr>
        `;
    }

    // Tampilkan data
    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;

        const amount = Number(data.amount || 0);
        const expenseDate = data.date || "";

        // Pecah tanggal YYYY-MM-DD
        const dateParts = expenseDate.split("-");

        if (dateParts.length === 3) {
            const tahun = Number(dateParts[0]);
            const bulan = Number(dateParts[1]) - 1;
            const tanggal = Number(dateParts[2]);

            // Hitung total bulan ini
            if (
                tahun === tahunSekarang &&
                bulan === bulanSekarang
            ) {
                totalBulanIni += amount;
            }

            // Hitung pengeluaran hari ini
            if (
                tahun === tahunSekarang &&
                bulan === bulanSekarang &&
                tanggal === tanggalSekarang
            ) {
                pengeluaranHariIni += amount;
            }
        }

        // Buat baris tabel
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${data.date || "-"}</td>
            <td>${data.description || "-"}</td>
            <td><span class="badge">${data.category || "-"}</span></td>
            <td>${formatRupiah(amount)}</td>
            <td>
                <button class="action-btn btn-edit"
                    onclick="window.editExpense(
                        '${id}',
                        '${(data.description || "").replace(/'/g, "\\'")}',
                        ${amount},
                        '${data.category || ""}'
                    )">
                    Edit
                </button>

                <button class="action-btn btn-delete"
                    onclick="window.deleteExpense('${id}')">
                    Hapus
                </button>
            </td>
        `;

        list.appendChild(row);
    });

    // 11. HITUNG SISA ANGGARAN
    const sisaAnggaran = anggaranBulanan - totalBulanIni;

    // 12. PERINGATAN ANGGARAN
    const warning = document.getElementById("warning");

    if (totalBulanIni > anggaranBulanan) {
        warning.style.display = "block";
        warning.textContent =
            "⚠️ Peringatan! Pengeluaran bulan ini sudah melebihi anggaran Rp1.500.000.";
    } else {
        warning.style.display = "none";
    }

    // 13. UPDATE STATISTIK
    document.getElementById("stat-today").textContent =
        formatRupiah(pengeluaranHariIni);

    document.getElementById("stat-month").textContent =
        formatRupiah(totalBulanIni);

    document.getElementById("stat-remaining").textContent =
        formatRupiah(sisaAnggaran);

}, (error) => {
    console.error("Error mengambil data:", error);

    document.getElementById("expense-list").innerHTML = `
        <tr>
            <td colspan="5" class="empty-state">
                Gagal mengambil data.
            </td>
        </tr>
    `;
});

// 14. HANDLE FORM SUBMIT
document.getElementById("expense-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const description =
        document.getElementById("description").value.trim();

    const amount =
        Number(document.getElementById("amount").value);

    const category =
        document.getElementById("category").value;

    // Tanggal otomatis
    const today = new Date();

    const date =
        today.getFullYear() +
        "-" +
        String(today.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(today.getDate()).padStart(2, "0");

    const editId =
        document.getElementById("expense-id").value;

    try {
        // MODE UPDATE
        if (editId) {
            await updateDoc(
                doc(db, "expenses", editId),
                {
                    description: description,
                    amount: amount,
                    category: category
                }
            );

            console.log("Data berhasil diperbarui.");

        } else {
            // MODE CREATE
            await addDoc(
                expensesCollection,
                {
                    description: description,
                    amount: amount,
                    category: category,
                    date: date,
                    createdAt: serverTimestamp()
                }
            );

            console.log("Data berhasil ditambahkan.");
        }

        resetForm();

    } catch (error) {
        console.error("Error:", error);
        alert("Gagal menyimpan data.");
    }
});

// 15. FUNGSI DELETE
window.deleteExpense = async (id) => {
    if (confirm("Yakin ingin menghapus data ini?")) {
        try {
            await deleteDoc(
                doc(db, "expenses", id)
            );

            console.log("Data berhasil dihapus.");

        } catch (error) {
            console.error("Error menghapus data:", error);
            alert("Gagal menghapus data.");
        }
    }
};

// 16. FUNGSI EDIT
window.editExpense = (
    id,
    description,
    amount,
    category
) => {
    document.getElementById("description").value =
        description;

    document.getElementById("amount").value =
        amount;

    document.getElementById("category").value =
        category;

    document.getElementById("expense-id").value =
        id;

    document.getElementById("btn-submit").textContent =
        "Update";

    document.getElementById("btn-cancel").style.display =
        "inline-block";
};

// 17. RESET FORM
function resetForm() {
    document.getElementById("expense-form").reset();

    document.getElementById("expense-id").value =
        "";

    document.getElementById("btn-submit").textContent =
        "Tambah";
}

// 18. TOMBOL BATAL
document.getElementById("btn-cancel").addEventListener(
    "click",
    resetForm
);