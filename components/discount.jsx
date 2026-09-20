import React,{useState} from "react"

const promoCodes = {

    SAVE10: {
        type: "percent",
        value: 10,
        minSpend: 50
    },

    FLAT25: {
        type: "flat",
        value: 25,
        minSpend: 100
    }

};
function Promo()
{
    const [code,setCode]=useState("")
    const [discount,setDiscount]=useState(0)
    const [loading,setLoading]=useState(false)
    const [error,setError]=useState("")
    const total=120;
  function apply()
  {
    setLoading(true)
    setError("")
    const promo=promoCodes[code.toLowerCase()]
    if(!promo)
    {
        setLoading(false)
        setError("Enter valid code")
        return 
    }
    if(promo.minSpend>total)
    {
        setLoading(false)
        setError("Spend more")
        return 
    }
    if(promo.type==="percent")
    {
        setDiscount((total*promo.value)/100)
    }
    else{
        setDiscount(promo.value)
    }
    setLoading(false)
    setError("")
  }
  return (
    <div>
        <input type="text"  value={code} onChange={(e)=>setCode(e.target.value)} />
        <button onClick={apply} >Apply</button>
        {loading &&<p>Loading...</p>}
        {
            error && <p>{error}</p>
        }
    </div>
  )
}