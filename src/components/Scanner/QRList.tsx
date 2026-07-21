import { useDispatch, useSelector } from "react-redux";
import { selectReceptsState } from "../../selectors/receptsSelectors";
import { Recept, removeRecept } from "../../slices/receptsSlice";
import { CircleX, Hourglass, CheckCircle2 } from "lucide-react";

type ReceptCardProps = {
  recept: Recept;
};

const QRItem = ({ recept }: ReceptCardProps) => {
  const dispatch = useDispatch()
  return (
    <div className="flex items-center justify-between border-b border-red-500 py-2">
      <a href={recept.url} className="truncate text-blue-600 hover:underline mr-3 flex-1">
        {recept.url}
      </a>
      <div className={`p-2 rounded-full mr-2 border ${recept.uploaded ? "border-green-200 bg-green-50 text-green-800" : "border-yellow-200 bg-yellow-50 text-yellow-800"}`}>
        {recept.uploaded ? <CheckCircle2 size={18} /> : <Hourglass size={18} />}
      </div>
      <div className={`p-2 rounded-full mr-2 border border-red-200 bg-red-50 text-red-800 hover:text-red-600`} onClick={() => dispatch(removeRecept(recept.id))}>

        <CircleX size={18} />

      </div>
    </div>
  )
};

export default function QRList() {
  const recepts = useSelector(selectReceptsState);
  return (
    <div>
      {recepts.map((r) => (
        <QRItem key={r.id} recept={r} />
      ))}
    </div>
  );
}
