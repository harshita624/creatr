import React,{useEffect,useState} from "react"

categories=[
  "electronics",
  "apparel",
  "books",
  "toys",
  "furniture"
]
function ProductFilter()
{
    const [category,setCategory]=useState("All")
    const [price,setPrice]=useState(1000)

    useEffect(()=>{
        const params=new URLSearchParams(window.location.search)
        if(params.get("category"))
        {
            setCategory(params.get("category"))
        }
        if(params.get("maxPrice"))
        {
            setPrice(params.get("maxPrice"))
        }

    },[])
    function updateURL(newcat,newprice){
        setCategory(newcat)
        setPrice(newprice)
        const params=new URLSearchParams()
        if(newcat!=="All")
        {
            params.set("category",newcat)
        }
        if(newprice<1000)
        {
            params.set("maxPrice",newprice)
        }
        window.history.pushState(
            {},
            "",
            window.location.pathname+"?"+params.toString()
        )
    }
    return(
        <div>
            <select value={category} onChange={(e)=>updateURL(e.target.value,price)}>
             <option value="all">All</option>
             {categories.map(item=>(
                    <option value={item} key={item}>{item}</option>
                ))}
            </select>
            <br/>
            <input type="range" min="100" max="1000" step="50" value={price} onChange={(e)=>updateURL(category,Number(e.target.value))}/>

            <p>URL:{window.location.search||"No filter"}</p>
        </div>
    )
}