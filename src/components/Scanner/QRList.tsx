import { useDispatch, useSelector } from "react-redux";
import { selectReceptsState } from "../../selectors/receptsSelectors";
import { Recept, removeRecept } from "../../slices/receptsSlice";
import { CircleX } from "lucide-react";

type ReceptCardProps = {
  recept: Recept;
};

const QRItem = ({ recept }: ReceptCardProps) => {
  const dispatch = useDispatch()
  return (
<div className="flex items-center justify-between border-b border-red-500">
  <a href={recept.url} className="truncate text-blue-600 hover:underline">
    {recept.url}
  </a>
  <button className="p-2 text-gray-500 hover:text-red-600" onClick={()=>dispatch(removeRecept(recept.id))}>
    <CircleX size={18} />
  </button>
</div>

)};

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
