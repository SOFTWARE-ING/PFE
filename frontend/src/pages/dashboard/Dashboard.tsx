import React, { useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import Modal from "../../components/ui/Modal";
import { Upload, FileText, CheckCircle, Download } from "lucide-react";

interface Document {
  name: string;
  url: string;
  status: "pending" | "signed";
  date: string;
}

const Dashboard: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];

    if (selected) {
      setFile(selected);
      setFileUrl(URL.createObjectURL(selected));
    }
  };

  const openSignatureModal = () => {
    if (file) setIsModalOpen(true);
  };

  const confirmSignature = () => {
    if (!file || !fileUrl) return;

    const newDoc: Document = {
      name: file.name,
      url: fileUrl,
      status: "signed",
      date: new Date().toISOString().split("T")[0],
    };

    setDocuments((prev) => [newDoc, ...prev]);

    setFile(null);
    setFileUrl(null);
    setIsModalOpen(false);
  };

  const downloadFile = (url: string, name: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
  };

  return (
    <DashboardLayout>

      <div className="space-y-6">

        {/* TITLE */}
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
            Document Signing
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Upload, preview and sign official documents
          </p>
        </div>

        {/* UPLOAD CARD */}
        <div className="
          p-6 rounded-2xl
          bg-white/70 dark:bg-slate-800/70
          border border-slate-200 dark:border-slate-700
          flex flex-col items-center text-center
        ">

          <Upload size={40} className="mb-4 text-blue-500" />

          <input
            type="file"
            accept="application/pdf"
            onChange={handleUpload}
            className="mb-4"
          />

          {file && (
            <>
              <div className="flex items-center gap-2 text-green-500 mb-4">
                <FileText size={16} />
                {file.name}
              </div>

              <button
                onClick={openSignatureModal}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
              >
                Preview & Sign
              </button>
            </>
          )}
        </div>

        {/* DOCUMENT TABLE */}
        <div className="
          p-6 rounded-2xl
          bg-white/70 dark:bg-slate-800/70
          border border-slate-200 dark:border-slate-700
        ">
          <h3 className="font-semibold mb-4 text-slate-800 dark:text-slate-200">
            Signed Documents
          </h3>

          {documents.length === 0 ? (
            <p className="text-sm text-slate-500">
              No documents signed yet
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {documents.map((doc, index) => (
                  <tr key={index} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="py-2 flex items-center gap-2">
                      <FileText size={16} />
                      {doc.name}
                    </td>

                    <td className="text-green-500 flex items-center gap-1">
                      <CheckCircle size={14} />
                      Signed
                    </td>

                    <td>{doc.date}</td>

                    <td>
                      <button
                        onClick={() => downloadFile(doc.url, doc.name)}
                        className="flex items-center gap-1 text-blue-500 hover:underline"
                      >
                        <Download size={14} />
                        Download
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>

        <h3 className="text-lg font-semibold mb-4">
          Document Preview
        </h3>

        {/* PDF VIEWER */}
        {fileUrl && (
          <div className="relative mb-4">

            <iframe
              src={fileUrl}
              className="w-full h-64 rounded-lg border"
            />

            {/* SIGNATURE OVERLAY */}
            <div className="
              absolute bottom-4 right-4
              bg-green-600/90 text-white
              px-3 py-1 rounded-lg text-xs
              shadow
            ">
              SIGNED (Preview)
            </div>

          </div>
        )}

        <button
          onClick={confirmSignature}
          className="
            w-full py-2 rounded-xl
            bg-green-600 hover:bg-green-700
            text-white
          "
        >
          Confirm Signature
        </button>

      </Modal>

    </DashboardLayout>
  );
};

export default Dashboard;