import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Eye, Receipt as ReceiptIcon, Search } from "lucide-react";

import { getReceiptsFromFirestore } from "../../firebase/receiptService";

const formatDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
};

const AdminReceipts = () => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("librarian")) navigate("/admin-login");
  }, [navigate]);

  useEffect(() => {
    (async () => {
      try {
        const data = await getReceiptsFromFirestore();
        data.sort(
          (a, b) =>
            new Date(b.createdAt || b.issueDate || 0) -
            new Date(a.createdAt || a.issueDate || 0),
        );
        setReceipts(data);
      } catch {
        toast.error("Failed to load receipts");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return receipts;
    return receipts.filter((r) =>
      [r.receiptId, r.issueId, r.studentName, r.bookTitle, r.studentLibraryId]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [receipts, search]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <button
          onClick={() => navigate("/admin-dashboard")}
          className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <ReceiptIcon className="text-blue-600" /> Receipts
          </h1>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by receipt, student or book"
              className="w-64 text-sm outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="p-3">Receipt</th>
                <th className="p-3">Student</th>
                <th className="p-3">Book</th>
                <th className="p-3">Date</th>
                <th className="p-3">Fine</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No receipts found.
                  </td>
                </tr>
              ) : (
                visible.map((r) => {
                  const issueId = r.issueId || r.receiptId || r.id;
                  return (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="p-3 font-medium">{r.receiptId || issueId}</td>
                      <td className="p-3">{r.studentName || "-"}</td>
                      <td className="p-3">{r.bookTitle || "-"}</td>
                      <td className="p-3">
                        {formatDate(r.createdAt || r.issueDate)}
                      </td>
                      <td className="p-3">₹{Number(r.fine || r.fineAmount || 0)}</td>
                      <td className="p-3">
                        <button
                          onClick={() => navigate(`/receipt/${issueId}`)}
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminReceipts;
